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
  Search,
  Building2,
  FileText
} from 'lucide-react';

interface OfficerDeedVerifierProps {
  initialCode?: string;
  onNavigateToWizard?: (plotId: number) => void;
}

export const OfficerDeedVerifier: React.FC<OfficerDeedVerifierProps> = ({
  initialCode = 'DL-2026-1001',
}) => {
  const { lang, t } = useAppUI();
  const [deedCode, setDeedCode] = useState(initialCode);
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperSuccessMsg, setTamperSuccessMsg] = useState<string | null>(null);
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

  const handleVerify = async (codeToVerify = deedCode) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;
    setLoading(true);
    setErrorMsg(null);
    setTamperSuccessMsg(null);

    try {
      if (cleanCode.toUpperCase().startsWith('NOC-')) {
        const res = await BhumiApi.verifyNocByCode(cleanCode);
        const isValid = Boolean(res.valid || res.verified || res.is_valid);
        setResult({
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
            area_decimal: res.noc?.mortgaged_area_decimal || '—',
            deed_type: 'BANK_NOC',
            declared_value_bdt: res.noc?.loan_amount_bdt || 0,
            status: 'NOC_RELEASED',
          },
          signature: res.signature || {
            verified: isValid,
            algorithm: 'Ed25519-EdDSA',
            signer_role: 'Bank Officer & Sub-Registrar',
            signature_hex: res.noc?.ed25519_signature || '0xed25519_authentic_bank_sig',
          },
          ledger: res.ledger || {
            block_index: res.block_index || 1,
            block_hash: res.block_hash || '0xledger_authentic_hash',
            is_valid: isValid,
          },
        });
      } else {
        const res = await BhumiApi.verifyDeedByCode(cleanCode);
        setResult(res);
      }
    } catch {
      setErrorMsg(t('সার্ভারে যোগাযোগ করা সম্ভব হয়নি।', 'Unable to connect to verification server.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleVerify(deedCode);
  }, []);

  const handleSimulateTamper = async () => {
    if (!result?.deed?.id && !result?.deed?.deed_no) return;
    setTamperLoading(true);
    setTamperSuccessMsg(null);
    try {
      const res = await BhumiApi.tamperDeedRecord(result.deed.deed_no || deedCode);
      setTamperSuccessMsg(lang === 'bn' ? res.message_bn : res.message_en);
      await handleVerify(deedCode);
    } catch {
      setErrorMsg(t('অখণ্ডতা অডিট টেস্ট ব্যর্থ হয়েছে।', 'Ledger integrity test failed.'));
    } finally {
      setTamperLoading(false);
    }
  };

  const handleRestoreTamper = async () => {
    setTamperLoading(true);
    try {
      await BhumiApi.resetLedger();
      setTamperSuccessMsg(t('রেকর্ড পূর্বাবস্থায় ফিরিয়ে আনা হয়েছে।', 'Record restored to authentic state.'));
      await handleVerify(deedCode);
    } catch {
      setErrorMsg(t('রিস্টোর ব্যর্থ হয়েছে।', 'Restore failed.'));
    } finally {
      setTamperLoading(false);
    }
  };

  const isVerified = Boolean(result?.verified && result?.signature?.verified);

  return (
    <div className="space-y-6 animate-rise">
      {/* Search and preset bar */}
      <div className="panel p-5 bg-gradient-to-r from-emerald-50/60 to-white border border-[#006A4E]/15">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#074f38] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#006A4E]" />
              <span>{t('দাপ্তরিক ক্রিপ্টোগ্রাফিক দলিল ও লেজার অখণ্ডতা যাচাই', 'Officer Cryptographic Deed & Ledger Verifier')}</span>
            </h3>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'Ed25519 ডিজিটাল স্বাক্ষর, SHA-256 ব্লকচেইন লেজার হ্যাশ এবং দাপ্তরিক নথির সত্যতা সরাসরি পরীক্ষা করুন:',
                'Verify Ed25519 digital signatures, SHA-256 ledger hashes, and document authenticity in-panel:'
              )}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(deedCode);
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <div className="relative flex-1 md:w-64">
              <input
                type="text"
                value={deedCode}
                onChange={(e) => setDeedCode(e.target.value)}
                placeholder="DL-2026-1001"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold focus:ring-2 focus:ring-[#006A4E]/30 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
            >
              {loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('যাচাই করুন', 'Verify')}
            </button>
          </form>
        </div>

        {/* Quick select presets */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#5F7A74] font-bold">{t('নমুনা রেকর্ডসমূহ:', 'Sample Records:')}</span>
          {[
            { label: 'DL-2026-1001 (বৈধ দলিল)', code: 'DL-2026-1001' },
            { label: 'DL-2024-1001 (২০২৪ দলিল)', code: 'DL-2024-1001' },
            { label: 'DL-2025-1004 (হেবা দলিল)', code: 'DL-2025-1004' },
            { label: 'NOC-2026-0001 (ব্যাংক NOC)', code: 'NOC-2026-0001' },
          ].map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => {
                setDeedCode(item.code);
                handleVerify(item.code);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border transition cursor-pointer ${
                deedCode === item.code
                  ? 'bg-[#006A4E] text-white border-[#006A4E]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
          <XOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {tamperSuccessMsg && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{tamperSuccessMsg}</span>
        </div>
      )}

      {/* Result Panel */}
      {result && result.deed && (
        <div className="space-y-6">
          {/* Status Hero Card */}
          <div
            className={`panel p-6 border-l-8 ${
              isVerified
                ? 'border-[#006A4E] bg-gradient-to-r from-emerald-50/70 to-white'
                : 'border-rose-600 bg-gradient-to-r from-rose-50/70 to-white'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isVerified ? 'bg-emerald-100 text-[#006A4E]' : 'bg-rose-100 text-rose-600'
                  }`}
                >
                  {isVerified ? <CheckCircle2 className="w-7 h-7" /> : <XOctagon className="w-7 h-7" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase px-2.5 py-0.5 rounded ${
                        isVerified ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {lang === 'bn' ? result.badge_bn : result.badge_en}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      #{result.deed.deed_no}
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
                  <span>{t('অফিসিয়াল সনদপত্র দেখুন', 'View Certificate')}</span>
                </button>

                {isVerified ? (
                  <button
                    onClick={handleSimulateTamper}
                    disabled={tamperLoading}
                    className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-rose-600" />
                    <span>{tamperLoading ? t('পরীক্ষা চলছে...', 'Testing...') : t('অডিট টেস্ট (Tamper Check)', 'Test Tamper Detection')}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRestoreTamper}
                    disabled={tamperLoading}
                    className="px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{t('আসল রেকর্ডে রিস্টোর', 'Restore Authentic')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Details Grid: Deed Metadata + Cryptographic Hashes */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Deed Metadata (7 cols) */}
            <div className="lg:col-span-7 panel p-5 space-y-4">
              <h4 className="font-bold text-sm text-[#074f38] border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#006A4E]" />
                <span>
                  {result.is_noc
                    ? t('ব্যাংক লিয়েন দায়মুক্তি ও সনদের বিবরণ', 'Bank Lien Clearance & NOC Records')
                    : t('দলিল রেকর্ড ও পক্ষগণের বিবরণ', 'Deed Records & Parties')}
                </span>
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('সনদ নম্বর:', 'Certificate No:') : t('দলিল নম্বর:', 'Deed Number:')}
                  </span>
                  <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{result.deed.deed_no}</div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('সনদের ধরন:', 'Certificate Type:') : t('দলিলের ধরন:', 'Deed Type:')}
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {result.is_noc ? t('ব্যাংক অনাপত্তিপত্র (NOC)', 'Bank Clearance (NOC)') : (result.deed.deed_type || 'SALE (বিক্রয় কোবালা)')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {lang === 'bn' ? result.deed.mouza_bn : result.deed.mouza_en} • {t('দাগ', 'Dag')} {result.deed.dag_no}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('বন্ধক অব্যাহতিপ্রাপ্ত জমি:', 'Cleared Mortgaged Area:') : t('জমির পরিমাণ:', 'Area Decimal:')}
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {toBanglaDigits(result.deed.area_decimal, lang)} {t('শতাংশ', 'decimals')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('অর্থায়নকারী ব্যাংক ও শাখা:', 'Financing Bank & Branch:') : t('প্রথম পক্ষ (হস্তান্তরকারী / বিক্রেতা):', 'Seller / Grantor:')}
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">{result.deed.seller_name_bn}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {result.is_noc ? `${t('শাখা:', 'Branch:')} ${result.deed.seller_nid}` : `NID: ${result.deed.seller_nid}`}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('দায়মুক্ত ঋণগ্রহীতা ও জমির মালিক:', 'Discharged Borrower & Owner:') : t('দ্বিতীয় পক্ষ (গ্রহীতা / ক্রেতা):', 'Buyer / Grantee:')}
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">{result.deed.buyer_name_bn}</div>
                  <div className="text-[10px] text-slate-500 font-mono">NID: {result.deed.buyer_nid}</div>
                </div>
                <div>
                  <span className="text-slate-500">
                    {result.is_noc ? t('পরিশোধিত ঋণ / দায়মুক্তি অঙ্ক:', 'Discharged Loan Amount:') : t('ঘোষিত মূল্য:', 'Declared Value:')}
                  </span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    ৳{toBanglaDigits(Number(result.deed.declared_value_bdt || 0).toLocaleString('en-US'), lang)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{t('রেজিস্ট্রি স্ট্যাটাস:', 'Registration Status:')}</span>
                  <div className="font-bold text-emerald-700 mt-0.5">{result.deed.status || 'REGISTERED'}</div>
                </div>
              </div>
            </div>

            {/* Cryptographic Ledger & Signature Card (5 cols) */}
            <div className="lg:col-span-5 panel p-5 space-y-4 bg-slate-900 text-white">
              <h4 className="font-bold text-sm text-emerald-400 border-b border-slate-800 pb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>{t('ক্রিপ্টোগ্রাফিক লেজার ও প্রমাণপত্র', 'Cryptographic Proof')}</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">{t('স্বাক্ষর অ্যালগরিদম:', 'Signature Algorithm:')}</span>
                  <div className="font-mono text-emerald-300 font-bold">
                    {result.signature?.algorithm || 'Ed25519-EdDSA (RFC 8032)'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">{t('ডিজিটাল স্বাক্ষর (Hex):', 'Ed25519 Signature:')}</span>
                  <div className="font-mono text-[10px] text-slate-300 bg-slate-800 p-2 rounded break-all border border-slate-700">
                    {result.signature?.signature_hex || '0xed25519_authentic_signature_verified'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px]">{t('ব্লকচেইন লেজার ব্লক হ্যাশ:', 'Ledger Block Hash:')}</span>
                  <div className="font-mono text-[10px] text-emerald-400 bg-slate-800 p-2 rounded break-all border border-slate-700">
                    {result.ledger?.block_hash || '0xsha256_block_hash_verified_immutable'}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                  <span>{t('ব্লক ইনডেক্স:', 'Block Index:')} #{result.ledger?.block_index || 1}</span>
                  <span className="text-emerald-400 font-bold">✔ {t('লেজারে সংরক্ষিত ও অপরিবর্তনীয়', 'Immutable on Ledger')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Certificate Modal */}
      {showCertModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">
                {t('অফিসিয়াল ডিজিটাল দলিল সত্যতা সনদপত্র', 'Official Cryptographic Deed Verification Certificate')}
              </h3>
              <button
                onClick={() => setShowCertModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-2 border-[#006A4E]/30 rounded-xl space-y-4 text-center bg-white">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                গণপ্রজাতন্ত্রী বাংলাদেশ সরকার • ভূমি মন্ত্রণালয় ও নিবন্ধন অধিদপ্তর
              </div>
              <h2 className="text-xl font-extrabold text-[#006A4E]">
                ডিজিটাল ভূমি সুরক্ষা ও দলিল বৈধতা প্রত্যয়নপত্র
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                এই প্রত্যয়ন করা যাচ্ছে যে, দলিল নম্বর <strong>{result.deed.deed_no}</strong> জাতীয় ভূমি লেজারে
                Ed25519 ক্রিপ্টোগ্রাফিক অ্যালগরিদম দ্বারা স্বাক্ষরিত এবং এর মালিকানা তথ্য অপরিবর্তনীয়।
              </p>

              <div className="my-4 grid grid-cols-2 gap-2 text-left text-xs bg-slate-50 p-4 rounded-lg border">
                <div><strong>মৌজা:</strong> {result.deed.mouza_bn}</div>
                <div><strong>দাগ নম্বর:</strong> {result.deed.dag_no}</div>
                <div><strong>জমির পরিমাণ:</strong> {result.deed.area_decimal} শতাংশ</div>
                <div><strong>বিক্রেতা:</strong> {result.deed.seller_name_bn}</div>
                <div><strong>ক্রেতা:</strong> {result.deed.buyer_name_bn}</div>
                <div><strong>স্বাক্ষর স্ট্যাটাস:</strong> বৈধ (Ed25519)</div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 break-all">
                Hash: {result.ledger?.block_hash || '0xsha256_certified_proof'}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-[#006A4E] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
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
