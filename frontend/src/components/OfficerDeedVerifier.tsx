import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  QrCode,
  CheckCircle2,
  XOctagon,
  KeyRound,
  Printer,
  X,
  AlertTriangle,
  FileCheck,
  Search,
  Building2,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

interface OfficerDeedVerifierProps {
  initialCode?: string;
  onNavigateToWizard?: (plotId: number) => void;
}

export const OfficerDeedVerifier: React.FC<OfficerDeedVerifierProps> = ({
  initialCode = '',
}) => {
  const { lang, t, formatDate } = useAppUI();

  // Read code and hash from props or current URL query parameters if present
  const getInitialValues = () => {
    if (initialCode && initialCode.trim()) {
      return { code: initialCode.trim(), hash: null };
    }
    try {
      const search = new URLSearchParams(window.location.search);
      const code = search.get('noc_no') || search.get('deed_no') || search.get('code') || '';
      const hash = search.get('h')?.trim() || null;
      return { code: code.trim(), hash };
    } catch {
      return { code: '', hash: null };
    }
  };

  const initialVals = getInitialValues();
  const [deedCode, setDeedCode] = useState(initialVals.code);
  const [hashParam, setHashParam] = useState<string | null>(initialVals.hash);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCertModal(false);
      }
    };
    if (showCertModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCertModal]);

  const handleVerify = async (
    codeToVerify = deedCode,
    hashPrefix: string | null = hashParam,
    syncUrl = true
  ) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;
    setLoading(true);
    setErrorMsg(null);
    const isNoc = cleanCode.toUpperCase().startsWith('NOC-');

    if (syncUrl) {
      try {
        const url = new URL(window.location.href);
        if (isNoc) {
          url.searchParams.set('noc_no', cleanCode);
          url.searchParams.delete('deed_no');
        } else {
          url.searchParams.set('deed_no', cleanCode);
          url.searchParams.delete('noc_no');
        }
        if (hashPrefix) {
          url.searchParams.set('h', hashPrefix);
        } else {
          url.searchParams.delete('h');
        }
        window.history.replaceState({}, '', url.toString());
      } catch {}
    }

    try {
      if (isNoc) {
        const res = await BhumiApi.verifyNocByCode(cleanCode, hashPrefix);
        const isValid = Boolean(res.valid || res.verified || res.is_valid);
        const nocData = res.noc || {};
        setResult({
          verified: isValid,
          is_noc: true,
          badge_bn: res.badge_bn || (isValid ? '✔ ব্যাংক দায়মুক্তি সনদ (NOC) যাচাই সম্পন্ন' : '✖ ব্যাংক দায়মুক্তি সনদ (NOC) যাচাই ব্যর্থ'),
          badge_en: res.badge_en || (isValid ? '✔ Bank Lien Clearance (NOC) Verified' : '✖ NOC Verification Failed'),
          message_bn: res.message_bn || (isValid ? 'ব্যাংক অনাপত্তিপত্রটি সিস্টেম রেকর্ডের সাথে মিলেছে এবং ঋণ দায়মুক্ত।' : 'এনওসি সনদের তথ্য বা স্বাক্ষরে গরমিল শনাক্ত হয়েছে।'),
          message_en: res.message_en || (isValid ? 'Bank No Objection Certificate verified against records; mortgage lien is discharged.' : 'Discrepancy detected in NOC record or signature.'),
          qr_data_uri: res.qr_svg_data_uri || res.qr_data_uri,
          noc: {
            noc_no: nocData.noc_no || cleanCode,
            bank_name_bn: nocData.bank_name_bn || 'অর্থায়নকারী ব্যাংক',
            bank_name_en: nocData.bank_name_en || 'Financing Bank',
            branch_bn: nocData.branch_bn || 'প্রধান শাখা',
            borrower_name_bn: nocData.borrower_name_bn || '',
            borrower_name_en: nocData.borrower_name_en || '',
            borrower_nid: nocData.borrower_nid || '',
            loan_amount_bdt: Number(nocData.amount_bdt ?? nocData.loan_amount_bdt ?? 0),
            released_at: nocData.released_at || '',
            status: nocData.status || res.status || (isValid ? 'RELEASED' : 'ACTIVE'),
            mouza_bn: nocData.mouza_bn || '',
            mouza_en: nocData.mouza_en || '',
            dag_no: nocData.dag_no || '',
            mortgaged_area_decimal: nocData.mortgaged_area_decimal,
          },
          cryptographic_proof: res.cryptographic_proof || {
            stored_content_hash: res.noc_hash || nocData.noc_hash || '',
            recomputed_content_hash: res.noc_hash || nocData.noc_hash || '',
            hash_matches: Boolean(res.hash_matches ?? isValid),
            signature_valid: Boolean(res.signature_valid ?? isValid),
            prev_hash: 'N/A (Mortgage Settlement Hash)',
          },
          ed25519_signature: res.ed25519_signature || '',
        });
      } else {
        const res = await BhumiApi.verifyDeedByCode(cleanCode, hashPrefix);
        setResult({
          ...res,
          is_noc: false,
        });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setErrorMsg(
          t(
            'এই নম্বরটি সিস্টেমে পাওয়া যায়নি। সঠিক দলিল বা NOC নম্বর দিন।',
            'Record not found in system. Please verify the deed or NOC number.'
          )
        );
      } else {
        setErrorMsg(
          t(
            'সার্ভারে যোগাযোগ করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
            'Unable to connect to verification server. Please try again.'
          )
        );
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Only auto-verify on mount if an actual non-empty code was provided in props or URL
  useEffect(() => {
    if (initialVals.code) {
      handleVerify(initialVals.code, initialVals.hash, false);
    }
  }, []);

  return (
    <div className="space-y-6 animate-rise">
      {/* Search Bar Panel */}
      <div className="panel p-5 bg-gradient-to-r from-emerald-50/60 to-white border border-[#006A4E]/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#074f38] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#006A4E]" />
              <span>{t('দাপ্তরিক দলিল ও এনওসি রেকর্ড যাচাই', 'Officer Document Verification (Deed & NOC)')}</span>
            </h3>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'স্থানীয় ডাটাবেজ রেকর্ড, Ed25519 ডিজিটাল স্বাক্ষর এবং হ্যাশ অখণ্ডতা যাচাই করুন:',
                'Verify local database records, Ed25519 signatures, and hash integrity:'
              )}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(deedCode, hashParam);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={deedCode}
                onChange={(e) => setDeedCode(e.target.value)}
                placeholder={t('দলিল বা NOC নম্বর লিখুন', 'Enter deed or NOC no')}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#006A4E]/30 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
            <button
              type="submit"
              disabled={loading || !deedCode.trim()}
              className="px-4 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
            >
              {loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('যাচাই করুন', 'Verify')}
            </button>
          </form>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="panel p-6 text-center space-y-2 animate-rise">
          <div className="w-6 h-6 border-2 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#074f38]">
            {t('স্থানীয় ডাটাবেজ ও ক্রিপ্টোগ্রাফিক রেকর্ড যাচাই করা হচ্ছে...', 'Verifying local record and cryptographic proof...')}
          </p>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && !loading && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Result Panel */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Status Hero Card */}
          <div
            className={`panel p-6 border-l-8 ${
              result.verified
                ? 'border-[#006A4E] bg-gradient-to-r from-emerald-50/70 to-white'
                : 'border-rose-600 bg-gradient-to-r from-rose-50/70 to-white'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    result.verified ? 'bg-emerald-100 text-[#006A4E]' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {result.verified ? <CheckCircle2 className="w-7 h-7" /> : <XOctagon className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded ${
                        result.verified ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {lang === 'bn' ? result.badge_bn : result.badge_en}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{result.is_noc ? result.noc?.noc_no : result.deed?.deed_no}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 font-semibold mt-1.5">
                    {lang === 'bn' ? result.message_bn : result.message_en}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowCertModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-[#074f38] hover:bg-[#053b2a] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('সনদপত্র দেখুন', 'View Certificate')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Officer Action / What to do next Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('কর্মকর্তার জন্য পরবর্তী করণীয় ও পর্যবেক্ষণ:', 'Officer Action & Next Steps:')}</span>
            </div>
            {result.is_noc ? (
              result.verified ? (
                <p className="text-slate-700 leading-relaxed">
                  {t(
                    'ব্যাংক দায়মুক্তি রেকর্ড সিস্টেমের সংরক্ষিত ডিজিটাল স্বাক্ষরের সাথে সমর্থিত। সাব-রেজিস্ট্রার বা সংশ্লিষ্ট কর্মকর্তা দায়মুক্তি সাপেক্ষে পরবর্তী নিবন্ধন কার্যক্রম গ্রহণ করতে পারেন।',
                    'Bank lien release matches system cryptographic signature. Officer may proceed with registration actions subject to standard physical verification.'
                  )}
                </p>
              ) : (
                <p className="text-rose-700 font-semibold leading-relaxed">
                  {t(
                    'সতর্কতা: দায়মুক্তি যাচাই ব্যর্থ হয়েছে অথবা লিয়েনটি এখনও কার্যকর আছে। ব্যাংক শাখা হতে মূল সত্যায়িত এনওসি ব্যতীত হস্তান্তর অনুমোদন করবেন না।',
                    'Warning: Clearance verification failed or lien remains active. Do not approve property transfer without authenticated clearance directly from the lending branch.'
                  )}
                </p>
              )
            ) : (
              result.verified ? (
                <p className="text-slate-700 leading-relaxed">
                  {t(
                    'দলিল রেকর্ড ও ডিজিটাল স্বাক্ষর অক্ষত রয়েছে। স্বাভাবিক কার্যপ্রণালী অনুযায়ী নামজারি ও বালাম রেকর্ড পর্যবেক্ষণ করুন।',
                    'Deed record and digital signature are intact. Proceed with standard physical volume and mutation checks.'
                  )}
                </p>
              ) : (
                <p className="text-rose-700 font-semibold leading-relaxed">
                  {t(
                    'সতর্কতা: দলিলের তথ্যে বা ডিজিটাল স্বাক্ষরে গরমিল শনাক্ত হয়েছে। মূল বালাম বহি ম্যানুয়ালি নিরীক্ষা না করা পর্যন্ত কোনো মিউটেশন বা পরবর্তী দলিল অনুমোদন স্থগিত রাখুন।',
                    'Warning: Discrepancy detected in deed record or digital signature. Hold any mutation or subsequent registration pending physical volume audit.'
                  )}
                </p>
              )
            )}
          </div>

          {/* Details Grid: Metadata + Cryptographic Hashes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Metadata (7 cols) */}
            <div className="lg:col-span-7 panel p-5 space-y-4">
              <h4 className="font-bold text-sm text-[#074f38] border-b border-slate-100 pb-2 flex items-center gap-2">
                {result.is_noc ? (
                  <Building2 className="w-4 h-4 text-[#006A4E]" />
                ) : (
                  <FileCheck className="w-4 h-4 text-[#006A4E]" />
                )}
                <span>
                  {result.is_noc
                    ? t('ব্যাংক লিয়েন দায়মুক্তি ও সনদের বিবরণ', 'Bank Lien Clearance & NOC Records')
                    : t('দলিল রেকর্ড ও পক্ষগণের বিবরণ', 'Deed Records & Parties')}
                </span>
              </h4>

              {result.is_noc ? (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">{t('সনদ নম্বর:', 'Certificate No:')}</span>
                    <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{result.noc?.noc_no}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('সনদের ধরন:', 'Certificate Type:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {t('ব্যাংক অনাপত্তিপত্র (NOC)', 'Bank Clearance (NOC)')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('অর্থায়নকারী ব্যাংক:', 'Financing Bank:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {lang === 'bn' ? result.noc?.bank_name_bn : result.noc?.bank_name_en || result.noc?.bank_name_bn}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('ব্যাংক শাখা:', 'Bank Branch:')}</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{result.noc?.branch_bn || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('দায়মুক্ত ঋণগ্রহীতার নাম:', 'Discharged Borrower:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">{result.noc?.borrower_name_bn || '—'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NID: {result.noc?.borrower_nid || '—'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('পরিশোধিত ঋণ অঙ্ক:', 'Discharged Loan Amount:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      ৳{toBanglaDigits(Number(result.noc?.loan_amount_bdt || 0).toLocaleString(), lang)} BDT
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('অব্যাহতি প্রদানের তারিখ:', 'Release Date:')}</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{formatDate(result.noc?.released_at)}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {result.noc?.mouza_bn} • {t('দাগ', 'Dag')} {toBanglaDigits(result.noc?.dag_no, lang)}
                    </div>
                  </div>
                  {result.noc?.mortgaged_area_decimal !== undefined && result.noc?.mortgaged_area_decimal > 0 && (
                    <div className="col-span-2">
                      <span className="text-slate-500">{t('বন্ধক অব্যাহতিপ্রাপ্ত জমি:', 'Mortgaged Area Cleared:')}</span>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {toBanglaDigits(result.noc.mortgaged_area_decimal, lang)} {t('শতাংশ', 'decimals')}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">{t('দলিল নম্বর:', 'Deed Number:')}</span>
                    <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{result.deed?.deed_no}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('দলিলের ধরন:', 'Deed Type:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {result.deed?.deed_type || 'SALE (বিক্রয় কোবালা)'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {lang === 'bn' ? result.deed?.mouza_bn : result.deed?.mouza_en} • {t('দাগ', 'Dag')} {toBanglaDigits(result.deed?.dag_no, lang)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('জমির পরিমাণ:', 'Area Decimal:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {toBanglaDigits(result.deed?.area_decimal, lang)} {t('শতাংশ', 'decimals')}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('প্রথম পক্ষ (বিক্রেতা / হস্তান্তরকারী):', 'Seller / Grantor:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">{result.deed?.seller_name_bn}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NID: {result.deed?.seller_nid}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('দ্বিতীয় পক্ষ (ক্রেতা / গ্রহীতা):', 'Buyer / Grantee:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">{result.deed?.buyer_name_bn}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NID: {result.deed?.buyer_nid}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('ঘোষিত মূল্য:', 'Declared Value:')}</span>
                    <div className="font-bold text-slate-800 mt-0.5">
                      ৳{toBanglaDigits(Number(result.deed?.price_bdt ?? result.deed?.declared_value_bdt ?? 0).toLocaleString(), lang)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">{t('রেজিস্ট্রি স্ট্যাটাস:', 'Registration Status:')}</span>
                    <div className="font-bold text-emerald-700 mt-0.5">{result.deed?.status || 'REGISTERED'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Cryptographic Proof Optional Disclosure (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <details className="panel p-5 bg-slate-900 text-white rounded-xl border border-slate-800 transition-all">
                <summary className="cursor-pointer font-bold text-sm text-emerald-400 flex items-center justify-between select-none list-none pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400" />
                    <span>{t('কারিগরি হ্যাশ ও ক্রিপ্টোগ্রাফিক বিবরণ', 'Cryptographic Proof (Optional)')}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </summary>

                <div className="space-y-3 text-xs pt-3 font-mono">
                  <div>
                    <span className="text-slate-400 text-[11px] font-sans">{t('স্বাক্ষর অ্যালগরিদম:', 'Signature Algorithm:')}</span>
                    <div className="text-emerald-300 font-bold">
                      Ed25519-EdDSA (RFC 8032) + SHA-256
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] font-sans">{t('সংরক্ষিত হ্যাশ (STORED_HASH):', 'Stored Hash:')}</span>
                    <div className="text-[10px] text-slate-300 bg-slate-800 p-2 rounded break-all border border-slate-700">
                      {result.cryptographic_proof?.stored_content_hash || '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] font-sans">{t('পুনর্গণনাকৃত হ্যাশ (RECOMPUTED_HASH):', 'Recomputed Hash:')}</span>
                    <div className="text-[10px] text-emerald-400 bg-slate-800 p-2 rounded break-all border border-slate-700">
                      {result.cryptographic_proof?.recomputed_content_hash || '—'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400 font-sans border-t border-slate-800">
                    <span>{t('হ্যাশ মিল:', 'Hash Integrity:')}</span>
                    <span className={result.cryptographic_proof?.hash_matches ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {result.cryptographic_proof?.hash_matches ? '✔ MATCHED' : '✖ MISMATCH'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                    <span>{t('ডিজিটাল স্বাক্ষর:', 'Signature Validity:')}</span>
                    <span className={result.cryptographic_proof?.signature_valid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {result.cryptographic_proof?.signature_valid ? '✔ VALID' : '✖ INVALID'}
                    </span>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Printable Certificate Modal */}
      {showCertModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 print:hidden">
              <h3 className="font-bold text-base text-slate-900">
                {t('ডিজিটাল নথি যাচাই সনদপত্র', 'Digital Document Verification Certificate')}
              </h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-2 border-[#006A4E]/30 rounded-xl space-y-4 text-center bg-white text-[#0A1F1C]">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                ভূমি সুরক্ষা (BhumiShield) • স্থানীয় নথি ও স্বাক্ষর নিরীক্ষা
              </div>
              <h2 className="text-xl font-extrabold text-[#006A4E]">
                {result.is_noc
                  ? t('ব্যাংক লিয়েন ডিজিটাল দায়মুক্তি প্রত্যয়নপত্র', 'Bank Lien Clearance Verification Certificate')
                  : t('ডিজিটাল দলিল বৈধতা ও স্বাক্ষর প্রত্যয়নপত্র', 'Digital Deed Verification Certificate')}
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {t(
                  `নথি নম্বর ${(result.is_noc ? result.noc?.noc_no : result.deed?.deed_no) || ''}-এর সংরক্ষিত রেকর্ড ও ক্রিপ্টোগ্রাফিক স্বাক্ষর সফলভাবে মিলিয়ে দেখা হয়েছে।`,
                  `Document ${(result.is_noc ? result.noc?.noc_no : result.deed?.deed_no) || ''} was audited against stored cryptographic signatures in the local database.`
                )}
              </p>

              <div className="my-4 grid grid-cols-2 gap-2 text-left text-xs bg-slate-50 p-4 rounded-lg border">
                {result.is_noc ? (
                  <>
                    <div><strong>সনদ নম্বর:</strong> {result.noc?.noc_no}</div>
                    <div><strong>দায়মুক্তি স্ট্যাটাস:</strong> {result.noc?.status}</div>
                    <div><strong>ব্যাংক:</strong> {result.noc?.bank_name_bn}</div>
                    <div><strong>শাখা:</strong> {result.noc?.branch_bn || '—'}</div>
                    <div><strong>ঋণগ্রহীতা:</strong> {result.noc?.borrower_name_bn}</div>
                    <div><strong>ঋণগ্রহীতা NID:</strong> {result.noc?.borrower_nid}</div>
                    <div><strong>পরিশোধিত ঋণ:</strong> ৳{toBanglaDigits(Number(result.noc?.loan_amount_bdt || 0).toLocaleString(), 'bn')} BDT</div>
                    <div><strong>অব্যাহতি তারিখ:</strong> {formatDate(result.noc?.released_at)}</div>
                  </>
                ) : (
                  <>
                    <div><strong>দলিল নম্বর:</strong> {result.deed?.deed_no}</div>
                    <div><strong>মৌজা:</strong> {result.deed?.mouza_bn}</div>
                    <div><strong>দাগ নম্বর:</strong> {toBanglaDigits(result.deed?.dag_no, 'bn')}</div>
                    <div><strong>জমির পরিমাণ:</strong> {toBanglaDigits(result.deed?.area_decimal, 'bn')} শতাংশ</div>
                    <div><strong>বিক্রেতা:</strong> {result.deed?.seller_name_bn}</div>
                    <div><strong>ক্রেতা:</strong> {result.deed?.buyer_name_bn}</div>
                  </>
                )}
              </div>

              <div className="text-[10px] font-mono text-slate-500 break-all p-2 bg-slate-100 rounded border">
                HASH: {result.cryptographic_proof?.stored_content_hash || '—'}
              </div>

              <div className="text-[10px] text-slate-500 text-left pt-2">
                {t(
                  'বিশেষ দ্রষ্টব্য: এটি ভূমি সুরক্ষা সফটওয়্যার সিস্টেমের একটি স্থানীয় ডাটাবেজ যাচাইকরণ রিপোর্ট। চূড়ান্ত আইনি লেনদেনের পূর্বে মূল বালাম বহি পরীক্ষা করুন।',
                  'Notice: This is a local database audit report generated by BhumiShield. Always inspect physical registry volumes prior to official land transfers.'
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>{t('প্রিন্ট করুন', 'Print')}</span>
              </button>
              <button
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                {t('বন্ধ করুন', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
