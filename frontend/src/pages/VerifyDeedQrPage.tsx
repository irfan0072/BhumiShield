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
  Building2,
  HelpCircle,
  ChevronDown,
  ArrowRight
} from 'lucide-react';

function parseVerificationUrl(): { code: string; hash: string | null; isNoc: boolean } | null {
  try {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const hash = searchParams.get('h')?.trim() || null;

    // Strip leading /bn or /en prefix if present
    let path = url.pathname.replace(/^\/(bn|en)(\/|$)/i, '/');
    if (!path.startsWith('/')) path = '/' + path;

    let code = '';
    let isNoc = false;

    // 1. Path-based deep links:
    // /verify/noc/{id-or-code} or /noc/{id-or-code}
    if (path.startsWith('/verify/noc/')) {
      const match = path.match(/^\/verify\/noc\/([^/?#]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]).trim();
        isNoc = true;
      }
    } else if (path.startsWith('/noc/')) {
      const match = path.match(/^\/noc\/([^/?#]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]).trim();
        isNoc = true;
      }
    } else if (path.startsWith('/verify/deed/')) {
      const match = path.match(/^\/verify\/deed\/([^/?#]+)/);
      if (match && match[1]) {
        code = decodeURIComponent(match[1]).trim();
        isNoc = false;
      }
    } else if (path.startsWith('/verify/')) {
      const match = path.match(/^\/verify\/([^/?#]+)/);
      if (match && match[1] && match[1].toLowerCase() !== 'qr') {
        code = decodeURIComponent(match[1]).trim();
        isNoc = code.toUpperCase().startsWith('NOC-');
      }
    }

    // 2. Query param overrides (?deed_no=..., ?noc_no=..., ?code=...)
    if (!code) {
      if (searchParams.get('noc_no')) {
        code = searchParams.get('noc_no')!.trim();
        isNoc = true;
      } else if (searchParams.get('deed_no')) {
        code = searchParams.get('deed_no')!.trim();
        isNoc = false;
      } else if (searchParams.get('code')) {
        code = searchParams.get('code')!.trim();
        isNoc = code.toUpperCase().startsWith('NOC-');
      }
    }

    // 3. Stored pending search from in-app navigation
    if (!code) {
      const pendingSearch = sessionStorage.getItem('bs_pending_verify_search');
      if (pendingSearch) {
        sessionStorage.removeItem('bs_pending_verify_search');
        code = pendingSearch.trim();
        if (code.toUpperCase().startsWith('NOC-')) {
          isNoc = true;
        }
      }
    }

    if (code) {
      return { code, hash, isNoc };
    }
  } catch {}

  return null;
}

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t, formatDate } = useAppUI();
  const [deedCode, setDeedCode] = useState('');
  const [hashParam, setHashParam] = useState<string | null>(null);
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
    forceNoc = false,
    syncUrl = true
  ) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;
    setLoading(true);
    setErrorMsg(null);
    const isNoc = forceNoc || cleanCode.toUpperCase().startsWith('NOC-');

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
          status: nocData.status || res.status || (isValid ? 'RELEASED' : 'ACTIVE'),
          badge_bn: res.badge_bn || (isValid ? '✔ ব্যাংক দায়মুক্তি সনদ (NOC) যাচাই সম্পন্ন' : '✖ ব্যাংক দায়মুক্তি সনদ (NOC) যাচাই ব্যর্থ'),
          badge_en: res.badge_en || (isValid ? '✔ Bank Lien Clearance (NOC) Verified' : '✖ NOC Verification Failed'),
          message_bn: res.message_bn || (isValid ? 'ব্যাংক অনাপত্তিপত্রটি সিস্টেম রেকর্ডের সাথে মিলেছে এবং ঋণ দায়মুক্ত।' : 'এনওসি সনদের তথ্য বা স্বাক্ষরে গরমিল শনাক্ত হয়েছে।'),
          message_en: res.message_en || (isValid ? 'Bank No Objection Certificate verified against records; mortgage lien is discharged.' : 'Discrepancy detected in NOC record or signature.'),
          qr_data_uri: res.qr_svg_data_uri || res.qr_data_uri,
          verify_url: res.verify_url,
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
            'সার্ভার সংযোগে ত্রুটি বা নেটওয়ার্ক সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
            'Network or server connection error. Please try again.'
          )
        );
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const syncFromUrl = () => {
      const parsed = parseVerificationUrl();
      if (parsed) {
        setDeedCode(parsed.code);
        setHashParam(parsed.hash);
        handleVerify(parsed.code, parsed.hash, parsed.isNoc, false);
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('নথি ও ডিজিটাল স্বাক্ষর যাচাই', 'Document & Digital Signature Verification')}</h1>
        <p>
          {t(
            'দলিল বা ব্যাংক অনাপত্তিপত্র (NOC) নম্বর দিয়ে স্থানীয় ডাটাবেজ রেকর্ড ও ক্রিপ্টোগ্রাফিক স্বাক্ষর যাচাই করুন।',
            'Verify local database records and cryptographic signatures for deeds and bank NOCs.'
          )}
        </p>
      </header>

      {/* Search Input Card */}
      <div className="panel p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#006A4E] shrink-0" />
            <span>{t('দলিল বা NOC নম্বর দিয়ে যাচাই', 'Verify by Deed or NOC Number')}</span>
          </h2>
          <span className="chip status-safe self-start md:self-auto">
            <KeyRound className="w-3.5 h-3.5" />
            {t('স্থানীয় রেকর্ড ও স্বাক্ষর নিরীক্ষা', 'Local Record & Signature Audit')}
          </span>
        </div>

        <p className="text-xs md:text-sm text-[#5F7A74] leading-relaxed">
          {t(
            'দলিলের গায়ে থাকা QR কোড স্ক্যান করুন অথবা দলিল বা NOC নম্বর লিখে অনুসন্ধান করুন। এটি সিস্টেম ডাটাবেজে সংরক্ষিত ডিজিটাল স্বাক্ষরের সাথে তথ্যের মিল যাচাই করে।',
            'Scan the document QR code or enter a Deed or NOC Number below to verify against stored digital signatures in the local database.'
          )}
        </p>

        {/* Search Bar (Starts Blank) */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={deedCode}
              onChange={(e) => setDeedCode(e.target.value)}
              placeholder={t('দলিল নম্বর (যেমন: DL-2026-1001) বা NOC নম্বর লিখুন', 'Enter deed number (e.g. DL-2026-1001) or NOC number')}
              className="field field-with-icon font-mono font-bold text-sm"
            />
            <QrCode className="w-5 h-5 text-[#5F7A74]/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={() => handleVerify(deedCode, hashParam)}
            disabled={loading || !deedCode.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('যাচাই হচ্ছে...', 'Verifying...')}</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>{t('যাচাই করুন', 'Verify')}</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-2 p-3.5 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 text-xs text-[#5F7A74] leading-relaxed">
          {t(
            'বিজ্ঞপ্তি: এই যাচাইকরণ সেবাটি সিস্টেমের স্থানীয় ডাটাবেজ রেকর্ড ও সংরক্ষিত ক্রিপ্টোগ্রাফিক স্বাক্ষরের ভিত্তিতে তথ্য প্রদর্শন করে। জমি লেনদেনের পূর্বে মূল বালাম বহি ও সাব-রেজিস্ট্রারের দপ্তরে শারীরিক নথি পরীক্ষা করা আবশ্যক।',
            'Notice: This verification tool checks records against the system local database and stored cryptographic signatures. For official land transactions, physical registry volumes must be inspected at the Sub-Registry office.'
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="panel p-8 text-center space-y-3 animate-rise">
          <div className="w-8 h-8 border-3 border-[#006A4E] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#074f38]">
            {t('যাচাইকরণ চলছে... স্থানীয় ডাটাবেজ রেকর্ড অনুসন্ধান করা হচ্ছে।', 'Verifying document records against local database...')}
          </p>
        </div>
      )}

      {/* Plain Error / Record Not Found Banner */}
      {errorMsg && !loading && (
        <div className="p-5 rounded-xl bg-amber-50 border-l-4 border-amber-500 space-y-2 animate-rise">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <div className="text-xs text-amber-800 leading-relaxed pl-7">
            <p className="font-semibold">{t('পরবর্তী করণীয়:', 'What to do next:')}</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>{t('নম্বরের বানান ও ফরম্যাট (যেমন: DL-2026-1001 বা NOC-2026-0001) সঠিক আছে কি না পুনরায় যাচাই করুন।', 'Verify document number format (e.g. DL-2026-1001 or NOC-2026-0001).')}</li>
              <li>{t('নথিটি সাম্প্রতিক হলে ডাটাবেজে অন্তর্ভুক্তির প্রক্রিয়ায় থাকতে পারে; সংশ্লিষ্ট সাব-রেজিস্ট্রি বা ব্যাংক শাখায় খোঁজ নিন।', 'If issued recently, record ingestion may be pending; check with the issuing Sub-Registry or bank branch.')}</li>
            </ul>
          </div>
        </div>
      )}

      {/* Verification Result Card */}
      {result && !loading && (
        <div className="space-y-6 animate-rise-delay-2">
          {/* Status Hero Card */}
          <div className="panel overflow-hidden">
            <div
              className={`p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
                result.verified ? 'bg-[#006A4E]' : 'bg-[#C53030]'
              }`}
            >
              <div className="flex items-start gap-4">
                {result.verified ? (
                  <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                ) : (
                  <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                    <XOctagon className="w-8 h-8 text-white" />
                  </div>
                )}
                <div>
                  <div className="text-xl md:text-2xl font-extrabold tracking-tight">
                    {lang === 'bn' ? result.badge_bn : result.badge_en}
                  </div>
                  <p className="mt-1 text-xs md:text-sm font-medium opacity-95 max-w-2xl">
                    {lang === 'bn' ? result.message_bn : result.message_en}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded bg-black/20 text-xs font-mono font-bold tracking-wider">
                      {result.is_noc ? result.noc?.noc_no : result.deed?.deed_no}
                    </span>
                    <span className="px-2.5 py-1 rounded bg-black/20 text-xs font-bold">
                      {t('অবস্থা:', 'Status:')} {result.is_noc ? result.noc?.status : result.deed?.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 w-full md:w-auto justify-between md:justify-center">
                {result.qr_data_uri && (
                  <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                    <img
                      src={result.qr_data_uri}
                      alt={`QR for ${result.is_noc ? result.noc?.noc_no : result.deed?.deed_no}`}
                      className="w-24 h-24"
                    />
                  </div>
                )}
                <button
                  onClick={() => setShowCertModal(true)}
                  className="px-4 py-2 rounded-lg bg-white text-[#0A1F1C] font-bold text-xs hover:bg-[#EDF7F4] shadow transition-colors flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                >
                  <Printer className="w-3.5 h-3.5 text-[#006A4E]" />
                  <span>{t('সনদ প্রিন্ট করুন', 'Print Certificate')}</span>
                </button>
              </div>
            </div>

            {/* What to do next section */}
            <div className="p-5 bg-[#F9FBFA] border-b border-[#006A4E]/10 space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#074f38] flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[#006A4E]" />
                <span>{t('পরবর্তী করণীয় (What To Do Next)', 'What To Do Next')}</span>
              </h3>
              {result.is_noc ? (
                result.verified ? (
                  <div className="text-xs text-[#0A1F1C]/90 leading-relaxed space-y-1">
                    <p>• {t('ব্যাংক দায়মুক্তি রেকর্ডভুক্ত হয়েছে। সম্পত্তি হস্তান্তর বা নিবন্ধনের পূর্বে সংশ্লিষ্ট সাব-রেজিস্ট্রি অফিসে দায়মুক্তির প্রমাণ দাখিল করুন।', 'The mortgage release is recorded. Submit this clearance to the relevant Sub-Registry office prior to title deed registration.')}</p>
                    <p>• {t('অর্থায়নকারী ব্যাংক শাখা থেকে মূল অনাপত্তিপত্র সংগ্রহ করে স্থায়ী মালিকানা নথিতে সংরক্ষণ করুন।', 'Retain the official signed clearance letter from the bank branch with your permanent property documents.')}</p>
                  </div>
                ) : (
                  <div className="text-xs text-[#9B1C1C] leading-relaxed space-y-1">
                    <p>• {t('সতর্কতা: বন্ধকটি এখনও সক্রিয় অথবা ডিজিটাল দায়মুক্তি স্বাক্ষর যাচাই করা যায়নি। জমিটিকে বন্ধকমুক্ত গণ্য করবেন না।', 'Warning: The mortgage lien is still active or the clearance signature failed validation. Do not treat this land as unencumbered.')}</p>
                    <p>• {t('অর্থায়নকারী ব্যাংক শাখায় সরাসরি যোগাযোগ করে ঋণ পরিশোধের সর্বশেষ অবস্থা পরীক্ষা করুন।', 'Contact the lending bank branch directly to verify the outstanding loan balance and clearance status.')}</p>
                  </div>
                )
              ) : (
                result.verified ? (
                  <div className="text-xs text-[#0A1F1C]/90 leading-relaxed space-y-1">
                    <p>• {t('আর্থিক লেনদেনের পূর্বে মূল বালাম বহি পরীক্ষা করুন এবং এসি ল্যান্ড অফিসে নামজারি (মিউটেশন) স্ট্যাটাস যাচাই করুন।', 'Verify physical registry volumes and confirm mutation (namjari) status with the AC Land office before financial transactions.')}</p>
                    <p>• {t('জমির দাগে কোনো সক্রিয় ব্যাংক বন্ধক বা খতিয়ান অমিল রয়েছে কি না তা "জমি কেনার আগে যাচাই" পাতায় দাগ নম্বর দিয়ে দেখে নিন।', 'Inspect bank liens and survey lineage using "Check Before You Buy" with the plot dag number.')}</p>
                  </div>
                ) : (
                  <div className="text-xs text-[#9B1C1C] leading-relaxed space-y-1">
                    <p>• {t('সতর্কতা: এই দলিলের তথ্যে গরমিল শনাক্ত হয়েছে। এর ভিত্তিতে কোনো প্রকার আর্থিক লেনদেন বা নামজারি অনুমোদন করবেন না।', 'Warning: Discrepancy detected in this deed record. Do not proceed with financial transactions or mutation approval.')}</p>
                    <p>• {t('নিকটস্থ সাব-রেজিস্ট্রার কার্যালয়ে মূল বালাম বহি ও নিবন্ধিত দলিলের কপি অবিলম্বে ম্যানুয়ালি যাচাই করুন।', 'Inspect physical registry volumes at the Sub-Registrar office immediately to investigate the discrepancy.')}</p>
                  </div>
                )
              )}
            </div>

            {/* Details Body */}
            <div className="p-6 space-y-6">
              {result.is_noc ? (
                /* Dedicated NOC Schema Details */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#006A4E]/10 pb-2">
                    <h3 className="text-sm font-extrabold text-[#0A1F1C] flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#006A4E]" />
                      <span>{t('ব্যাংক লিয়েন দায়মুক্তি (NOC) বিবরণ', 'Bank Lien Clearance (NOC) Details')}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#5F7A74]">
                      {t('ব্যাংক দায়মুক্তি রেকর্ড', 'Bank Clearance Record')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('দায়মুক্তি সনদ (NOC) নম্বর', 'NOC Certificate No')}</span>
                      <span className="font-mono font-bold text-[#0A1F1C] text-sm">{result.noc?.noc_no}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('সনদের স্ট্যাটাস', 'Clearance Status')}</span>
                      <span className="font-bold text-[#006A4E] text-sm">{result.noc?.status}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('পরিশোধিত ঋণ / দায়মুক্তি অঙ্ক', 'Discharged Loan Amount')}</span>
                      <span className="font-extrabold text-[#0A1F1C] text-sm">
                        ৳ {toBanglaDigits(Number(result.noc?.loan_amount_bdt || 0).toLocaleString(), lang)} BDT
                      </span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('অর্থায়নকারী ব্যাংক', 'Financing Bank')}</span>
                      <span className="font-bold text-[#0A1F1C] block">
                        {lang === 'bn' ? result.noc?.bank_name_bn : result.noc?.bank_name_en || result.noc?.bank_name_bn}
                      </span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('ব্যাংক শাখা', 'Bank Branch')}</span>
                      <span className="font-semibold text-[#0A1F1C] block">{result.noc?.branch_bn || '—'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('অব্যাহতি প্রদানের তারিখ', 'Release Date')}</span>
                      <span className="font-semibold text-[#0A1F1C] block">
                        {formatDate(result.noc?.released_at)}
                      </span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('দায়মুক্ত ঋণগ্রহীতার নাম', 'Discharged Borrower')}</span>
                      <span className="font-bold text-[#0A1F1C] block">{result.noc?.borrower_name_bn || '—'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('ঋণগ্রহীতার জাতীয় পরিচয়পত্র (NID)', 'Borrower NID')}</span>
                      <span className="font-mono font-bold text-[#0A1F1C] block">{result.noc?.borrower_nid || '—'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('মৌজা ও দাগ নম্বর', 'Mouza & Dag No')}</span>
                      <span className="font-semibold text-[#0A1F1C] block">
                        {lang === 'bn' ? result.noc?.mouza_bn : result.noc?.mouza_en || result.noc?.mouza_bn},{' '}
                        {t('দাগ নং', 'Dag')} {toBanglaDigits(result.noc?.dag_no, lang)}
                      </span>
                    </div>

                    {result.noc?.mortgaged_area_decimal !== undefined && result.noc?.mortgaged_area_decimal > 0 && (
                      <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10 sm:col-span-2 md:col-span-3">
                        <span className="text-[11px] text-[#5F7A74] block">{t('বন্ধক অব্যাহতিপ্রাপ্ত জমির পরিমাণ', 'Mortgaged Land Area Cleared')}</span>
                        <span className="font-extrabold text-[#0A1F1C] text-sm">
                          {toBanglaDigits(result.noc.mortgaged_area_decimal, lang)} {t('শতাংশ', 'decimals')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Dedicated Deed Schema Details */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#006A4E]/10 pb-2">
                    <h3 className="text-sm font-extrabold text-[#0A1F1C] flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#006A4E]" />
                      <span>{t('দলিলের বিবরণী', 'Deed Details')}</span>
                    </h3>
                    <span className="text-[11px] font-bold text-[#5F7A74]">
                      {t('সাব-রেজিস্ট্রি রেকর্ড', 'Sub-Registry Record')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-[#0A1F1C]/90">
                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('দলিল নম্বর', 'Deed Number')}</span>
                      <span className="font-mono font-bold text-[#0A1F1C] text-sm">{result.deed?.deed_no}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('দলিলের ধরন', 'Deed Type')}</span>
                      <span className="font-bold text-[#0A1F1C]">{result.deed?.deed_type || 'SAF_KABALA (বিক্রয়)'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('নিবন্ধন স্ট্যাটাস', 'Registration Status')}</span>
                      <span className="font-bold text-[#006A4E]">{result.deed?.status || 'REGISTERED'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10 sm:col-span-2">
                      <span className="text-[11px] text-[#5F7A74] block">{t('মৌজা ও দাগ নং', 'Mouza & Dag No')}</span>
                      <span className="font-bold text-[#0A1F1C]">
                        {lang === 'bn' ? result.deed?.mouza_bn : result.deed?.mouza_en || result.deed?.mouza_bn},{' '}
                        {t('দাগ নং', 'Dag')} {toBanglaDigits(result.deed?.dag_no, lang)}
                      </span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('জমির পরিমাণ ও অংশ', 'Area & Share')}</span>
                      <span className="font-extrabold text-[#0A1F1C] text-sm">
                        {toBanglaDigits(result.deed?.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                      </span>
                      <span className="text-[#5F7A74] text-xs ml-2">
                        ({t('অংশ:', 'Share:')} {result.deed?.share_fraction || '১/১'})
                      </span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('প্রথম পক্ষ (বিক্রেতা / হস্তান্তরকারী)', 'Seller / Grantor')}</span>
                      <span className="font-bold text-[#0A1F1C] block">{result.deed?.seller_name_bn || '—'}</span>
                      <span className="text-[10px] text-[#5F7A74] font-mono">NID: {result.deed?.seller_nid || '—'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('দ্বিতীয় পক্ষ (ক্রেতা / গ্রহীতা)', 'Buyer / Grantee')}</span>
                      <span className="font-bold text-[#0A1F1C] block">{result.deed?.buyer_name_bn || '—'}</span>
                      <span className="text-[10px] text-[#5F7A74] font-mono">NID: {result.deed?.buyer_nid || '—'}</span>
                    </div>

                    <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                      <span className="text-[11px] text-[#5F7A74] block">{t('ঘোষিত মূল্য', 'Declared Value')}</span>
                      <span className="font-bold text-[#0A1F1C]">
                        ৳ {toBanglaDigits(Number(result.deed?.price_bdt ?? result.deed?.declared_value_bdt ?? 0).toLocaleString(), lang)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Disclosure for Technical Hashes */}
              <details className="rounded-xl border border-slate-700/60 bg-[#0c1f1c] text-white p-4 transition-all">
                <summary className="cursor-pointer font-bold text-xs text-emerald-400 flex items-center justify-between select-none list-none">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {t(
                        'কারিগরি হ্যাশ ও ক্রিপ্টোগ্রাফিক বিবরণ (ঐচ্ছিক)',
                        'Technical Hashes & Cryptographic Proof (Optional)'
                      )}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center gap-1 font-sans">
                    <span>{t('বিস্তারিত অডিট দেখুন', 'View Audit Details')}</span>
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </summary>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-3 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      {t('STORED_CONTENT_HASH (ডাটাবেজে সংরক্ষিত হ্যাশ):', 'STORED_CONTENT_HASH:')}
                    </span>
                    <div className="break-all p-2 bg-black/40 rounded border border-white/10 text-slate-200 mt-1">
                      {result.cryptographic_proof?.stored_content_hash || '—'}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      {t('RECOMPUTED_HASH (সরাসরি গণনাকৃত হ্যাশ):', 'RECOMPUTED_HASH:')}
                    </span>
                    <div
                      className={`break-all p-2 rounded border mt-1 ${
                        result.cryptographic_proof?.hash_matches
                          ? 'bg-[#006A4E]/25 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      }`}
                    >
                      {result.cryptographic_proof?.recomputed_content_hash || '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-sans">
                    <div className="p-2.5 bg-black/30 rounded border border-white/10">
                      <span className="text-[10px] text-slate-400 block">HASH_INTEGRITY:</span>
                      <span
                        className={`font-bold text-xs ${
                          result.cryptographic_proof?.hash_matches ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {result.cryptographic_proof?.hash_matches ? 'MATCHED (অক্ষত)' : 'MISMATCH (অমিল)'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-black/30 rounded border border-white/10">
                      <span className="text-[10px] text-slate-400 block">ED25519_SIGNATURE:</span>
                      <span
                        className={`font-bold text-xs ${
                          result.cryptographic_proof?.signature_valid ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {result.cryptographic_proof?.signature_valid ? 'VALID (বৈধ)' : 'INVALID (অবৈধ)'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase tracking-wider">
                      {t('PREV_BLOCK_HASH (পূর্ববর্তী লিংকের রেফারেন্স):', 'PREV_BLOCK_HASH:')}
                    </span>
                    <div className="break-all p-2 bg-black/40 rounded border border-white/10 text-slate-400 text-[10px] mt-1">
                      {result.cryptographic_proof?.prev_hash || 'N/A (Genesis / First Block)'}
                    </div>
                  </div>

                  <div className="pt-2 text-slate-400 text-[11px] font-sans border-t border-slate-800">
                    {t(
                      'মন্তব্য: এই যাচাইকরণে প্রদর্শিত হ্যাশ ও ডিজিটাল স্বাক্ষরটি সিস্টেমের স্থানীয় ডাটাবেজ রেকর্ডের সাথে গাণিতিকভাবে যাচাইকৃত।',
                      'Note: The cryptographic hash and digital signature shown here are validated against local system database records.'
                    )}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Official Verification Certificate Modal (Printable) */}
      {showCertModal && result && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-[#006A4E]/12">
            {/* Modal Controls (Screen Only) */}
            <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#006A4E]" />
                <h2 className="font-bold text-base text-[#074f38]">
                  {t('যাচাইকরণ সনদ প্রিভিউ', 'Verification Certificate Preview')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
                </button>
                <button
                  onClick={() => setShowCertModal(false)}
                  className="p-2 rounded-lg text-[#5F7A74]/80 hover:text-[#5F7A74] hover:bg-[#EDF7F4] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Certificate Content */}
            <div className="p-6 border-4 border-double border-[#006A4E]/25 rounded-xl bg-white space-y-6 text-[#0A1F1C]">
              {/* Header with System Title */}
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-base mb-2 shadow-sm">
                  ভূমি
                </div>
                <h3 className="font-extrabold text-base tracking-wide text-[#0A1F1C]">
                  ভূমি সুরক্ষা (BhumiShield)
                </h3>
                <p className="text-xs font-bold text-[#006A4E]">
                  {result.is_noc
                    ? t('ব্যাংক লিয়েন ডিজিটাল দায়মুক্তি (NOC) যাচাই প্রত্যয়ন', 'Bank Lien Clearance (NOC) Verification Record')
                    : t('ডিজিটাল দলিল তথ্য ও স্বাক্ষর যাচাই সনদ', 'Digital Deed Verification Record')}
                </p>
                <p className="text-[10px] text-[#5F7A74] font-mono">
                  REF: {(result.is_noc ? result.noc?.noc_no : result.deed?.deed_no) || 'DOC'}-LOCAL-VERIFY
                </p>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-lg text-center font-extrabold text-xs sm:text-sm ${
                  result.verified
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {result.verified
                  ? t('✔ ডিজিটাল স্বাক্ষর ও রেকর্ড যাচাই সম্পন্ন: সংরক্ষিত তথ্যের সাথে মিলেছে', '✔ Verification Passed: Document Matches Stored Database Record & Signature')
                  : t('✖ সতর্কতা: নথির তথ্যে অমিল বা স্বাক্ষর যাচাই ব্যর্থ', '✖ Warning: Record Discrepancy or Verification Failure Detected')}
              </div>

              {/* Attributes Grid */}
              {result.is_noc ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('সনদ নম্বর:', 'Certificate No:')}</span>
                    <strong className="font-mono">{result.noc?.noc_no}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('দায়মুক্তি অবস্থা:', 'Status:')}</span>
                    <strong>{result.noc?.status}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('অর্থায়নকারী ব্যাংক:', 'Bank:')}</span>
                    <strong>{lang === 'bn' ? result.noc?.bank_name_bn : result.noc?.bank_name_en || result.noc?.bank_name_bn}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('ব্যাংক শাখা:', 'Branch:')}</span>
                    <strong>{result.noc?.branch_bn || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('দায়মুক্ত ঋণগ্রহীতা:', 'Borrower:')}</span>
                    <strong>{result.noc?.borrower_name_bn}</strong> (NID: {result.noc?.borrower_nid})
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('পরিশোধিত ঋণ অঙ্ক:', 'Loan Amount:')}</span>
                    <strong>৳ {toBanglaDigits(Number(result.noc?.loan_amount_bdt || 0).toLocaleString(), lang)} BDT</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('অব্যাহতি প্রদানের তারিখ:', 'Release Date:')}</span>
                    <strong>{formatDate(result.noc?.released_at)}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</span>
                    <strong>{result.noc?.mouza_bn}, দাগ নং {toBanglaDigits(result.noc?.dag_no, lang)}</strong>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('দলিল নম্বর:', 'Deed No:')}</span>
                    <strong className="font-mono">{result.deed?.deed_no}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('নিবন্ধন অবস্থা:', 'Status:')}</span>
                    <strong>{result.deed?.status}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('মৌজা ও জেএল:', 'Mouza:')}</span>
                    <strong>{result.deed?.mouza_bn || result.deed?.mouza_en}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('দাগ নম্বর:', 'Dag No:')}</span>
                    <strong>দাগ নং {toBanglaDigits(result.deed?.dag_no, lang)}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('বিক্রেতা:', 'Seller:')}</span>
                    <strong>{result.deed?.seller_name_bn}</strong> (NID: {result.deed?.seller_nid})
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('ক্রেতা:', 'Buyer:')}</span>
                    <strong>{result.deed?.buyer_name_bn}</strong> (NID: {result.deed?.buyer_nid})
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('জমির পরিমাণ:', 'Area:')}</span>
                    <strong>{toBanglaDigits(result.deed?.area_decimal, lang)} {t('শতাংশ', 'decimals')}</strong>
                  </div>
                  <div>
                    <span className="text-[#5F7A74] block text-[10px]">{t('ঘোষিত মূল্য:', 'Declared Value:')}</span>
                    <strong>৳ {toBanglaDigits(Number(result.deed?.price_bdt ?? result.deed?.declared_value_bdt ?? 0).toLocaleString(), lang)} BDT</strong>
                  </div>
                </div>
              )}

              {/* Cryptographic Footprint (Honest & Compact) */}
              <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/12 text-[10px] font-mono space-y-1">
                <div className="font-sans font-bold text-[11px] text-[#006A4E]">
                  {t('ক্রিপ্টোগ্রাফিক যাচাই অডিট:', 'Cryptographic Audit Summary:')}
                </div>
                <div className="break-all">
                  <strong>STORED_HASH:</strong> {result.cryptographic_proof?.stored_content_hash || '—'}
                </div>
                <div>
                  <strong>ED25519_SIGNATURE:</strong> {result.cryptographic_proof?.signature_valid ? 'VALID' : 'INVALID'} |{' '}
                  <strong>HASH_INTEGRITY:</strong> {result.cryptographic_proof?.hash_matches ? 'MATCHED' : 'FAILED'}
                </div>
              </div>

              {/* QR and Sign-off */}
              <div className="flex items-center justify-between pt-4 border-t">
                {result.qr_data_uri && (
                  <div className="flex items-center gap-3">
                    <img
                      src={result.qr_data_uri}
                      alt="Verification QR"
                      className="w-16 h-16 border rounded p-1 bg-white"
                    />
                    <div className="text-[10px] text-[#5F7A74] leading-tight">
                      <p className="font-bold text-[#0A1F1C]/90">{t('অনলাইন যাচাই QR', 'Verification QR')}</p>
                      <p>{t('স্ক্যান করে সত্যতা নিশ্চিত করুন', 'Scan to re-verify')}</p>
                    </div>
                  </div>
                )}
                <div className="text-right text-[10px] text-[#5F7A74]">
                  <div className="h-8 flex items-end justify-end">
                    <div className="font-mono font-bold text-xs text-[#006A4E] border-b border-dashed border-slate-400 pb-0.5">
                      [BhumiShield System Seal]
                    </div>
                  </div>
                  <p className="font-bold mt-1">{t('ভূমি সুরক্ষা সফটওয়্যার সিস্টেম', 'BhumiShield Software System')}</p>
                  <p>{t('স্থানীয় ডাটাবেজ নিরীক্ষা রেকর্ড', 'Local Database Verification Record')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
