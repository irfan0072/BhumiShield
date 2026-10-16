import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { QrCode, CheckCircle2, XOctagon, ShieldCheck, KeyRound } from 'lucide-react';

export const VerifyDeedQrPage: React.FC = () => {
  const { lang, t } = useAppUI();
  const [deedCode, setDeedCode] = useState('DEED-2026-0001');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify = deedCode) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await BhumiApi.verifyDeedByCode(codeToVerify.trim());
      setResult(res);
    } catch {
      setErrorMsg(
        t(
          'এই দলিল নম্বরটি লেজারে পাওয়া যায়নি। সঠিক দলিল নম্বর দিন (যেমন: DEED-2026-0001 বা DEED-2026-0005)।',
          'Deed number not found in ledger. Try DEED-2026-0001 or DEED-2026-0005.'
        )
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleVerify('DEED-2026-0001');
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200 shadow-xs space-y-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#006A4E] flex items-center gap-2">
          <QrCode className="w-8 h-8" />
          <span>
            {t(
              'QR কোড ও ক্রিপ্টোগ্রাফিক হ্যাশ-চেইন দলিল যাচাই',
              'QR Code & Cryptographic Hash-Chain Deed Verification'
            )}
          </span>
        </h1>
        <p className="text-[#5F6B66]">
          {t(
            'দলিলের QR কোড স্ক্যান করুন অথবা নিচের বক্সে দলিল নম্বর লিখে দেখুন দলিলটি নিবন্ধনের পর কোনো অসাধু চক্র পরিবর্তন (Tamper) করেছে কি না।',
            'Scan a deed QR or enter a Deed Number below to verify its Ed25519 signature and SHA-256 hash chain.'
          )}
        </p>

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => {
              setDeedCode('DEED-2026-0001');
              handleVerify('DEED-2026-0001');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold text-sm border border-[#006A4E]/30 hover:bg-[#006A4E] hover:text-white cursor-pointer"
          >
            ✔ {t('DEED-2026-0001 (আসল ও অক্ষত দলিল)', 'DEED-2026-0001 (Authentic Deed)')}
          </button>

          <button
            onClick={() => {
              setDeedCode('DEED-2026-0005');
              handleVerify('DEED-2026-0005');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#FEECEE] text-[#F42A41] font-bold text-sm border border-[#F42A41]/30 hover:bg-[#F42A41] hover:text-white cursor-pointer"
          >
            ✖ {t('DEED-2026-0005 (জালিয়াতি / টেম্পারড দলিল)', 'DEED-2026-0005 (Tampered Area Deed)')}
          </button>

          <button
            onClick={() => {
              setDeedCode('DEED-2026-0002');
              handleVerify('DEED-2026-0002');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#FEF3C7] text-[#B7791F] font-bold text-sm border border-[#B7791F]/30 hover:bg-[#B7791F] hover:text-white cursor-pointer"
          >
            ⚠ {t('DEED-2026-0002 (দ্বিতীয়বার বিক্রির প্রচেষ্টা - HELD)', 'DEED-2026-0002 (Double Sale - HELD)')}
          </button>
        </div>

        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            value={deedCode}
            onChange={(e) => setDeedCode(e.target.value)}
            placeholder="DEED-2026-0001"
            className="flex-1 p-3.5 rounded-xl border-2 border-gray-300 font-mono font-bold text-lg"
          />
          <button
            onClick={() => handleVerify(deedCode)}
            disabled={loading}
            className="px-8 py-3.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-extrabold text-lg cursor-pointer"
          >
            {loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('দলিল যাচাই করুন', 'Verify Deed')}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-[#FEECEE] border-l-8 border-[#F42A41] font-bold text-[#1A1A1A]">
          {errorMsg}
        </div>
      )}

      {/* Verification Result Card */}
      {result && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-white">
          <div
            className={`p-6 md:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
              result.verified ? 'bg-[#006A4E]' : 'bg-[#F42A41]'
            }`}
          >
            <div className="flex items-start gap-4">
              {result.verified ? (
                <CheckCircle2 className="w-12 h-12 shrink-0" />
              ) : (
                <XOctagon className="w-12 h-12 shrink-0" />
              )}
              <div>
                <div className="text-2xl md:text-3xl font-extrabold">
                  {lang === 'bn' ? result.badge_bn : result.badge_en}
                </div>
                <p className="mt-2 text-lg font-medium">
                  {lang === 'bn' ? result.message_bn : result.message_en}
                </p>
              </div>
            </div>

            {result.qr_data_uri && (
              <div className="bg-white p-2 rounded-xl shrink-0">
                <img
                  src={result.qr_data_uri}
                  alt={`QR for ${result.deed.deed_no}`}
                  className="w-28 h-28"
                />
              </div>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#1A1A1A] border-b pb-2">
                {t('দলিলের মূল তথ্য', 'Deed Metadata')}
              </h3>
              <p>
                <strong>{t('দলিল নম্বর:', 'Deed No:')}</strong> {result.deed.deed_no}
              </p>
              <p>
                <strong>{t('মৌজা ও দাগ:', 'Mouza & Plot:')}</strong>{' '}
                {lang === 'bn' ? result.deed.mouza_bn : result.deed.mouza_en},{' '}
                {t('দাগ নং', 'Dag')} {toBanglaDigits(result.deed.dag_no, lang)}
              </p>
              <p>
                <strong>{t('বিক্রেতা:', 'Seller:')}</strong> {result.deed.seller_name_bn} (NID:{' '}
                {result.deed.seller_nid})
              </p>
              <p>
                <strong>{t('ক্রেতা:', 'Buyer:')}</strong> {result.deed.buyer_name_bn} (NID:{' '}
                {result.deed.buyer_nid})
              </p>
              <p>
                <strong>{t('জমির পরিমাণ:', 'Transferred Area:')}</strong>{' '}
                {toBanglaDigits(result.deed.area_decimal, lang)} {t('শতাংশ', 'Decimal')} (
                {t('অংশ:', 'Share:')} {result.deed.share_fraction})
              </p>
              <p>
                <strong>{t('নিবন্ধন অবস্থা:', 'Status:')}</strong>{' '}
                <span className="font-bold">{result.deed.status}</span>
              </p>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 font-mono text-xs">
              <div className="font-sans font-bold text-sm text-[#006A4E] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" />
                <span>
                  {t(
                    'ক্রিপ্টোগ্রাফিক লেজার ও স্বাক্ষর পরীক্ষা (Ed25519 + SHA-256)',
                    'Cryptographic Ledger & Ed25519 Proof'
                  )}
                </span>
              </div>
              <div>
                <strong>CHAIN_INDEX:</strong> #{result.deed.chain_index}
              </div>
              <div className="break-all">
                <strong>STORED_HASH:</strong> {result.cryptographic_proof.stored_content_hash}
              </div>
              <div className="break-all">
                <strong>RECOMPUTED_HASH:</strong>{' '}
                <span
                  className={
                    result.cryptographic_proof.hash_matches
                      ? 'text-[#006A4E] font-bold'
                      : 'text-[#F42A41] font-bold'
                  }
                >
                  {result.cryptographic_proof.recomputed_content_hash}
                </span>
              </div>
              <div className="break-all">
                <strong>PREV_BLOCK_HASH:</strong> {result.cryptographic_proof.prev_hash}
              </div>
              <div>
                <strong>ED25519_SIGNATURE_VALID:</strong>{' '}
                {result.cryptographic_proof.signature_valid ? 'TRUE (VALID)' : 'FALSE (INVALID)'}
              </div>
              <div className="pt-2 flex items-center gap-2 font-sans text-xs text-gray-600">
                <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                <span>
                  {t(
                    'নিবন্ধনের পর ডাটাবেজে ১টি অক্ষরও পরিবর্তন করলে হ্যাশ মিলবে না।',
                    'Changing even 1 byte in the database breaks the recomputed SHA-256 hash.'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
