import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  QrCode,
  CheckCircle2,
  XOctagon,
  ShieldCheck,
  KeyRound,
  Printer,
  X,
  AlertTriangle,
  RotateCcw,
  Zap,
  Lock,
  FileCheck,
  Shield
} from 'lucide-react';

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [deedCode, setDeedCode] = useState('DL-2026-1001');
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

  const handleVerify = async (codeToVerify = deedCode, hashPrefix: string | null = null, forceNoc = false) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      if (forceNoc || cleanCode.toUpperCase().startsWith('NOC-')) {
        const res = await BhumiApi.verifyNocByCode(cleanCode, hashPrefix);
        const isValid = Boolean(res.valid || res.verified || res.is_valid);
        const mapped = {
          verified: isValid,
          is_noc: true,
          badge_bn: res.badge_bn || (isValid ? '✔ ব্যাংক লিয়েন ডিজিটাল দায়মুক্তি (NOC) সনদ বৈধ' : '✖ অবৈধ বা অমিল দায়মুক্তি (NOC) সনদ'),
          badge_en: res.badge_en || (isValid ? '✔ Bank Lien Clearance (NOC) Cryptographically Verified' : '✖ Invalid or Tampered NOC Certificate'),
          message_bn: res.message_bn || (isValid ? 'এই লিয়েনটির ঋণ পরিশোধিত এবং ডিজিটাল অনাপত্তিপত্র অপরিবর্তনীয়।' : 'এনওসি সনদের তথ্য বা স্বাক্ষরে গরমিল শনাক্ত হয়েছে।'),
          message_en: res.message_en || (isValid ? 'This mortgage lien was settled and the cryptographic clearance is authentic.' : 'Discrepancy detected in NOC record or signature.'),
          qr_data_uri: res.qr_svg_data_uri || res.qr_data_uri,
          deed: {
            deed_no: res.noc?.noc_no || cleanCode,
            mouza_bn: res.noc?.mouza_bn || '',
            mouza_en: res.noc?.mouza_en || '',
            dag_no: res.noc?.dag_no || '',
            seller_name_bn: res.noc?.bank_name_bn || 'ব্যাংক জামানত বিভাগ',
            seller_nid: res.noc?.branch_bn || '',
            buyer_name_bn: res.noc?.borrower_name_bn || '',
            buyer_nid: res.noc?.borrower_nid || '',
            area_decimal: res.noc?.mortgaged_area_decimal ?? '—',
            deed_type: 'BANK_NOC',
            declared_value_bdt: res.noc?.loan_amount_bdt || 0,
            price_bdt: res.noc?.loan_amount_bdt || 0,
            status: res.noc?.status || 'RELEASED',
          },
          cryptographic_proof: res.cryptographic_proof || {
            stored_content_hash: res.noc?.noc_hash || '',
            recomputed_content_hash: res.noc?.noc_hash || '',
            hash_matches: isValid,
            prev_hash: 'N/A (Bank Settlement)',
            signature_valid: isValid,
          },
        };
        setResult(mapped);
      } else {
        const res = await BhumiApi.verifyDeedByCode(cleanCode, hashPrefix);
        setResult(res);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setErrorMsg(
          t(
            'এই নম্বরটি লেজারে পাওয়া যায়নি। সঠিক দলিল বা NOC নম্বর দিন (যেমন: DL-2026-1001 বা NOC-2026-0001)।',
            'Record not found in ledger. Try DL-2026-1001 or NOC-2026-0001.'
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
    const searchParams = new URLSearchParams(window.location.search);
    const hashParam = searchParams.get('h')?.trim() || null;
    const path = window.location.pathname;

    let targetCode = '';
    let isNocRoute = false;

    // 1. Path-based deep links:
    // /verify/noc/{id-or-code} or /noc/{id-or-code}
    if (path.includes('/verify/noc/')) {
      const match = path.match(/\/verify\/noc\/([^/?#]+)/);
      if (match && match[1]) {
        targetCode = decodeURIComponent(match[1]);
        isNocRoute = true;
      }
    } else if (path.includes('/noc/')) {
      const match = path.match(/\/noc\/([^/?#]+)/);
      if (match && match[1]) {
        targetCode = decodeURIComponent(match[1]);
        isNocRoute = true;
      }
    } else if (path.includes('/verify/deed/')) {
      const match = path.match(/\/verify\/deed\/([^/?#]+)/);
      if (match && match[1]) {
        targetCode = decodeURIComponent(match[1]);
        isNocRoute = false;
      }
    } else if (path.includes('/verify/')) {
      const match = path.match(/\/verify\/([^/?#]+)/);
      if (match && match[1] && match[1] !== 'qr') {
        targetCode = decodeURIComponent(match[1]);
        if (targetCode.toUpperCase().startsWith('NOC-')) {
          isNocRoute = true;
        }
      }
    }

    // 2. Query param overrides
    if (!targetCode) {
      if (searchParams.get('noc_no')) {
        targetCode = searchParams.get('noc_no')!.trim();
        isNocRoute = true;
      } else if (searchParams.get('deed_no')) {
        targetCode = searchParams.get('deed_no')!.trim();
        isNocRoute = false;
      }
    }

    // 3. Stored pending search (only if not a direct URL with path/params)
    if (!targetCode) {
      const pendingSearch = sessionStorage.getItem('bs_pending_verify_search');
      if (pendingSearch) {
        sessionStorage.removeItem('bs_pending_verify_search');
        targetCode = pendingSearch.trim();
        if (targetCode.toUpperCase().startsWith('NOC-')) {
          isNocRoute = true;
        }
      }
    }

    if (!targetCode) {
      targetCode = 'DL-2026-1001';
    }

    setDeedCode(targetCode);
    handleVerify(targetCode, hashParam, isNocRoute);
  }, []);

  return (
    <div className="space-y-6">
      <header className="page-intro animate-rise">
        <h1>{t('QR ও হ্যাশ দলিল যাচাই', 'QR & Hash Deed Verify')}</h1>
        <p>{t('দলিল নম্বর বা QR দিয়ে Ed25519 স্বাক্ষর ও SHA-256 চেইন অখণ্ডতা নিশ্চিত করুন।', 'Confirm Ed25519 signature and SHA-256 chain integrity from a deed number or QR.')}</p>
      </header>
      {/* Top Banner / Card */}
      <div className="panel p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h2 className="font-bold text-lg text-[#074f38] flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#006A4E] shrink-0" />
            <span>
              {t(
                'দলিল নম্বর দিয়ে যাচাই',
                'Verify by deed number'
              )}
            </span>
          </h2>
          <span className="chip status-safe self-start md:self-auto">
            <Lock className="w-3.5 h-3.5" />
            Ed25519 + SHA-256
          </span>
        </div>

        <p className="text-xs md:text-sm text-[#5F7A74] leading-relaxed">
          {t(
            'দলিলের গায়ে থাকা QR কোড স্ক্যান করুন অথবা দলিল নম্বর লিখে দেখুন দলিলটি নিবন্ধনের পর কোনো অসাধু চক্র বা সার্ভার অ্যাডমিন তথ্য পরিবর্তন (Tamper) করেছে কি না।',
            'Scan a deed QR or enter a Deed Number below to verify its Ed25519 signature and SHA-256 hash chain.'
          )}
        </p>

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#5F7A74] uppercase tracking-wider">
            {t('অনুমোদিত ও যাচাইকৃত সাম্প্রতিক দলিলসমূহ:', 'Verified & Audited Deed Records:')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setDeedCode('DL-2026-1001');
                handleVerify('DL-2026-1001');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1001'
                  ? 'bg-[#006A4E] text-white border-[#006A4E]'
                  : 'bg-[#EDF7F4] text-[#006A4E] border-[#006A4E]/30 hover:bg-[#006A4E] hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1001 (স্বাক্ষরিত ও অক্ষত দলিল)', 'DL-2026-1001 (Authentic Signed Deed)')}</span>
            </button>

            <button
              onClick={() => {
                setDeedCode('DL-2026-1005');
                handleVerify('DL-2026-1005');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1005'
                  ? 'bg-[#FF3B4A] text-white border-[#FF3B4A]'
                  : 'bg-[#FFF0F1] text-[#FF3B4A] border-[#FF3B4A]/30 hover:bg-[#FF3B4A] hover:text-white'
              }`}
            >
              <XOctagon className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1005 (নিরাপত্তা নিরীক্ষায় অমিল চিহ্নিত)', 'DL-2026-1005 (Flagged by Security Audit)')}</span>
            </button>

            <button
              onClick={() => {
                setDeedCode('DL-2026-1002');
                handleVerify('DL-2026-1002');
              }}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs border transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                deedCode === 'DL-2026-1002'
                  ? 'bg-[#C4891A] text-white border-[#C4891A]'
                  : 'bg-[#FBF3E0] text-[#C4891A] border-[#C4891A]/30 hover:bg-[#C4891A] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('DL-2026-1002 (মিউটেশন পেন্ডিং দলিল)', 'DL-2026-1002 (Pending Mutation Deed)')}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={deedCode}
              onChange={(e) => setDeedCode(e.target.value)}
              placeholder="DL-2026-1001"
              className="field field-with-icon font-mono font-bold text-sm"
            />
            <QrCode className="w-5 h-5 text-[#5F7A74]/80 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={() => handleVerify(deedCode)}
            disabled={loading}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('যাচাই হচ্ছে...', 'Verifying...')}</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{t('দলিল যাচাই করুন', 'Verify Deed')}</span>
              </>
            )}
          </button>
        </div>

        {/* Cryptographic Ledger Integrity & Architecture Panel */}
        <div className="mt-4 p-4 rounded-xl bg-[#EDF7F4]/80 border border-[#006A4E]/12 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]/90">
              <Shield className="w-4 h-4 text-[#006A4E]" />
              <span>{t('লেজার অখণ্ডতা ও ক্রিপ্টোগ্রাফিক নিরাপত্তা:', 'Ledger Integrity & Cryptographic Security Architecture:')}</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {t('ক্রিপ্টোগ্রাফিক সুরক্ষা ও ডিফেন্স ইঞ্জিন', 'Cryptographic Security & Defense Engine')}
            </span>
          </div>

          <p className="text-xs text-[#5F7A74] leading-relaxed">
            {t(
              'যদি কোনো অনুমোদনহীনভাবে ডাটাবেজে দলিলের জমির পরিমাণ বা কোনো তথ্য পরিবর্তন করা হয়, SHA-256 হ্যাশ চেইন তাৎক্ষণিকভাবে অখণ্ডতা লঙ্ঘন সনাক্ত করে লাল সতর্কবার্তায় রূপান্তর করে। অপারেটর ইন্টিগ্রিটি ড্রিল কমান্ড: php artisan bhumi:drill:tamper {deed_code} --confirm',
              'If any unauthorized DB modification occurs, the cryptographic SHA-256 hash chain instantly flags integrity violation and revokes validity. Operator storage integrity drill: php artisan bhumi:drill:tamper {deed_code} --confirm'
            )}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FFF0F1] border-l-4 border-[#FF3B4A] font-bold text-xs text-[#0A1F1C] flex items-center gap-2">
          <XOctagon className="w-4 h-4 text-[#FF3B4A] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="panel overflow-hidden animate-rise-delay-2">
          {/* Header Banner */}
          <div
            className={`p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors ${
              result.verified ? 'bg-[#006A4E]' : 'bg-[#FF3B4A]'
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
                    {result.deed?.deed_no}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-black/20 text-xs font-bold">
                    {t('অবস্থা:', 'Status:')} {result.deed?.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end gap-3 shrink-0 w-full md:w-auto justify-between md:justify-center">
              {result.qr_data_uri && (
                <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                  <img
                    src={result.qr_data_uri}
                    alt={`QR for ${result.deed?.deed_no}`}
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

          {/* Details Body */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
            {/* Deed Metadata */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-extrabold text-[#0A1F1C] flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#006A4E]" />
                  <span>
                    {result.is_noc
                      ? t('ব্যাংক লিয়েন দায়মুক্তি ও সনদের বিবরণ', 'Bank Lien Clearance & NOC Metadata')
                      : t('দলিলের দাপ্তরিক বিবরণী', 'Official Deed Metadata')}
                  </span>
                </h3>
                <span className="text-[11px] font-bold text-[#5F7A74]">
                  {result.is_noc
                    ? t('ব্যাংক ও সাব-রেজিস্ট্রি সমন্বয়', 'Bank & Registry Sync')
                    : t('সাব-রেজিস্ট্রি রেকর্ড', 'Sub-Registry Record')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#0A1F1C]/90">
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                  <span className="text-[11px] text-[#5F7A74] block">
                    {result.is_noc ? t('দায়মুক্তি সনদ (NOC) নম্বর', 'NOC Certificate No') : t('দলিল নম্বর', 'Deed Number')}
                  </span>
                  <span className="font-mono font-bold text-[#0A1F1C] text-sm">{result.deed?.deed_no}</span>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                  <span className="text-[11px] text-[#5F7A74] block">
                    {result.is_noc ? t('সনদের ধরন', 'Certificate Type') : t('দলিলের ধরন', 'Deed Type')}
                  </span>
                  <span className="font-bold text-[#0A1F1C]">
                    {result.is_noc
                      ? t('ব্যাংক ঋণ দায়মুক্তি (NOC)', 'Bank Mortgage Clearance (NOC)')
                      : (result.deed?.deed_type || 'SAF_KABALA (বিক্রয়)')}
                  </span>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10 sm:col-span-2">
                  <span className="text-[11px] text-[#5F7A74] block">{t('মৌজা ও দাগ নং', 'Mouza & Dag No')}</span>
                  <span className="font-bold text-[#0A1F1C]">
                    {lang === 'bn' ? result.deed?.mouza_bn : result.deed?.mouza_en || result.deed?.mouza_bn},{' '}
                    {t('দাগ নং', 'Dag')} {toBanglaDigits(result.deed?.dag_no, lang)}
                  </span>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                  <span className="text-[11px] text-[#5F7A74] block">
                    {result.is_noc ? t('অর্থায়নকারী ব্যাংক ও শাখা', 'Financing Bank & Branch') : t('বিক্রেতা', 'Seller')}
                  </span>
                  <span className="font-bold text-[#0A1F1C] block">{result.deed?.seller_name_bn}</span>
                  <span className="text-[10px] text-[#5F7A74] font-mono">
                    {result.is_noc ? `${t('শাখা:', 'Branch:')} ${result.deed?.seller_nid}` : `NID: ${result.deed?.seller_nid}`}
                  </span>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10">
                  <span className="text-[11px] text-[#5F7A74] block">
                    {result.is_noc ? t('ঋণগ্রহীতা ও জমির মালিক', 'Borrower & Landowner') : t('ক্রেতা', 'Buyer')}
                  </span>
                  <span className="font-bold text-[#0A1F1C] block">{result.deed?.buyer_name_bn}</span>
                  <span className="text-[10px] text-[#5F7A74] font-mono">NID: {result.deed?.buyer_nid}</span>
                </div>
                <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/10 sm:col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#5F7A74] block">
                      {result.is_noc ? t('বন্ধক অব্যাহতিপ্রাপ্ত জমি', 'Mortgaged Area Cleared') : t('জমির পরিমাণ ও অংশ', 'Area & Share')}
                    </span>
                    <span className="font-extrabold text-[#0A1F1C] text-sm">
                      {toBanglaDigits(result.deed?.area_decimal, lang)} {t('শতাংশ', 'Decimal')}
                    </span>
                    {!result.is_noc && (
                      <span className="text-[#5F7A74] text-xs ml-2">
                        ({t('অংশ:', 'Share:')} {result.deed?.share_fraction || '১/১'})
                      </span>
                    )}
                  </div>
                  {result.deed?.price_bdt !== undefined && (
                    <div className="text-right">
                      <span className="text-[11px] text-[#5F7A74] block">
                        {result.is_noc ? t('পরিশোধিত ঋণ / দায়মুক্তি অঙ্ক', 'Discharged Loan Amount') : t('ঘোষিত মূল্য', 'Declared Value')}
                      </span>
                      <span className="font-bold text-[#0A1F1C]">
                        ৳ {toBanglaDigits(Number(result.deed.price_bdt).toLocaleString(), lang)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Ed25519 Proof */}
            <div className="space-y-3 panel-ink p-5 font-mono text-[11px] shadow-inner">
              <div className="font-sans font-bold text-xs text-[#10B981] flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {t(
                      'ক্রিপ্টোগ্রাফিক লেজার ও ডিজিটাল স্বাক্ষর অডিট',
                      'Cryptographic Ledger & Ed25519 Audit'
                    )}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-[#EDF7F4]/80">
                  CHAIN_INDEX #{result.deed?.chain_index ?? 1}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <span className="text-[#5F7A74]/80 block text-[10px] uppercase tracking-wider">
                    STORED_CONTENT_HASH (নিবন্ধনকালে স্বাক্ষরিত হ্যাশ):
                  </span>
                  <div className="break-all p-2 bg-black/30 rounded border border-white/10 text-slate-200">
                    {result.cryptographic_proof?.stored_content_hash}
                  </div>
                </div>

                <div>
                  <span className="text-[#5F7A74]/80 block text-[10px] uppercase tracking-wider">
                    RECOMPUTED_HASH (বর্তমান ডাটাবেজের সরাসরি SHA-256 গণনা):
                  </span>
                  <div
                    className={`break-all p-2 rounded border ${
                      result.cryptographic_proof?.hash_matches
                        ? 'bg-[#006A4E]/25 border-[#10B981]/40 text-[#A7F3D0] font-bold'
                        : 'bg-[#FF3B4A]/20 border-[#FF3B4A]/50 text-[#FF8A93] font-bold'
                    }`}
                  >
                    {result.cryptographic_proof?.recomputed_content_hash}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-black/25 rounded border border-white/10">
                    <span className="text-[10px] text-[#5F7A74]/80 block">HASH_INTEGRITY:</span>
                    <span
                      className={`font-bold font-sans text-xs ${
                        result.cryptographic_proof?.hash_matches ? 'text-[#10B981]' : 'text-[#FF3B4A]'
                      }`}
                    >
                      {result.cryptographic_proof?.hash_matches ? 'MATCHED (অক্ষত)' : 'MISMATCH (পরিবর্তিত)'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-black/25 rounded border border-white/10">
                    <span className="text-[10px] text-[#5F7A74]/80 block">ED25519_SIGNATURE:</span>
                    <span
                      className={`font-bold font-sans text-xs ${
                        result.cryptographic_proof?.signature_valid ? 'text-[#10B981]' : 'text-[#FF3B4A]'
                      }`}
                    >
                      {result.cryptographic_proof?.signature_valid ? 'VALID (বৈধ)' : 'INVALID (অবৈধ)'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[#5F7A74]/80 block text-[10px] uppercase tracking-wider">
                    PREV_BLOCK_HASH (পূর্ববর্তী ব্লকের লিংক):
                  </span>
                  <div className="break-all p-2 bg-black/30 rounded border border-white/10 text-[#5F7A74]/80 text-[10px]">
                    {result.cryptographic_proof?.prev_hash || 'GENESIS_BLOCK_0000000000000000'}
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2 font-sans text-[11px] text-[#5F7A74]/80 border-t border-white/10">
                  <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                  <span>
                    {t(
                      'ভূমি সুরক্ষা প্রটোকলে প্রতিটি দলিল পূর্ববর্তী দলিলের সাথে গাণিতিকভাবে আবদ্ধ। কোনো পরিবর্তন লুকানো অসম্ভব।',
                      'Each deed in BhumiShield is chained to the previous block. Silent data tampering is mathematically impossible.'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Deed Verification Certificate Modal (Printable) */}
      {showCertModal && result && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-[#006A4E]/12">
            {/* Modal Controls (Screen Only) */}
            <div className="flex items-center justify-between border-b pb-4 mb-6 print:hidden">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#006A4E]" />
                <h2 className="font-bold text-base text-[#074f38]">
                  {t('অফিসিয়াল দলিল সনদ প্রিভিউ', 'Official Deed Certificate Preview')}
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
            <div className="p-6 border-4 border-double border-[#006A4E]/20 rounded-xl bg-white space-y-6 text-[#0A1F1C]">
              {/* Header with Emblem */}
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-sm">
                  ভূমি
                </div>
                <h3 className="font-extrabold text-base tracking-wide text-[#0A1F1C]">
                  গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                </h3>
                <p className="text-xs font-bold text-[#006A4E]">
                  ভূমি মন্ত্রণালয় • নিবন্ধন পরিদপ্তর • ভূমি সুরক্ষা ক্রিপ্টোগ্রাফিক সনদ
                </p>
                <p className="text-[10px] text-[#5F7A74] font-mono">
                  VERIFICATION CERTIFICATE NO: {result.deed?.deed_no}-CERT-{Date.now().toString().slice(-6)}
                </p>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-lg text-center font-extrabold text-sm ${
                  result.verified
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                {result.verified ? '✔ ডিজিটাল স্বাক্ষর ও লেজার যাচাই সম্পন্ন: দলিলটি সম্পূর্ণ বৈধ ও অক্ষত' : '✖ সতর্কতা: দলিলে টেম্পারিং বা তথ্য পরিবর্তনের প্রমাণ মিলেছে'}
              </div>

              {/* Deed Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">দলিল নম্বর:</span>
                  <strong className="font-mono">{result.deed?.deed_no}</strong>
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">নিবন্ধন অবস্থা:</span>
                  <strong>{result.deed?.status}</strong>
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">মৌজা ও জেএল:</span>
                  <strong>{result.deed?.mouza_bn || result.deed?.mouza_en}</strong>
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">দাগ নম্বর:</span>
                  <strong>দাগ নং {toBanglaDigits(result.deed?.dag_no, 'bn')}</strong>
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">বিক্রেতা:</span>
                  <strong>{result.deed?.seller_name_bn}</strong> (NID: {result.deed?.seller_nid})
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">ক্রেতা:</span>
                  <strong>{result.deed?.buyer_name_bn}</strong> (NID: {result.deed?.buyer_nid})
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">জমির পরিমাণ:</span>
                  <strong>{toBanglaDigits(result.deed?.area_decimal, 'bn')} শতাংশ</strong>
                </div>
                <div>
                  <span className="text-[#5F7A74] block text-[10px]">চেইন ইনডেক্স:</span>
                  <strong className="font-mono">#{result.deed?.chain_index ?? 1}</strong>
                </div>
              </div>

              {/* Cryptographic Footprint */}
              <div className="p-3 bg-[#EDF7F4]/80 rounded-lg border border-[#006A4E]/12 text-[10px] font-mono space-y-1.5">
                <div className="font-sans font-bold text-[11px] text-[#006A4E]">
                  ক্রিপ্টোগ্রাফিক হ্যাশ প্রমাণ (SHA-256):
                </div>
                <div className="break-all">
                  <strong>STORED_HASH:</strong> {result.cryptographic_proof?.stored_content_hash}
                </div>
                <div className="break-all">
                  <strong>RECOMPUTED_HASH:</strong> {result.cryptographic_proof?.recomputed_content_hash}
                </div>
                <div>
                  <strong>ED25519_SIGNATURE:</strong> {result.cryptographic_proof?.signature_valid ? 'VALID' : 'INVALID'} | <strong>HASH_INTEGRITY:</strong> {result.cryptographic_proof?.hash_matches ? 'VERIFIED' : 'FAILED'}
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
                      <p className="font-bold text-[#0A1F1C]/90">QR কোড স্ক্যান করে</p>
                      <p>অনলাইনে তাৎক্ষণিক</p>
                      <p>বৈধতা যাচাই করুন</p>
                    </div>
                  </div>
                )}
                <div className="text-right text-[10px] text-[#5F7A74]">
                  <div className="h-10 flex items-end justify-end">
                    <div className="font-mono font-bold text-xs text-[#006A4E] border-b border-dashed border-slate-400 pb-0.5">
                      [Ed25519 Digital Seal]
                    </div>
                  </div>
                  <p className="font-bold mt-1">সাব-রেজিস্ট্রার কার্যালয়</p>
                  <p>ভূমি সুরক্ষা ব্লকচেইন গেটওয়ে</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
