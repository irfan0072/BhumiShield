import React, { useEffect, useRef, useState } from 'react';
import {
  QrCode,
  Camera,
  ShieldAlert,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { formatCurrency } from '../theme/tokens';
import { VerdictBanner } from '../components/VerdictBanner';

interface VerifyDeedPageProps {
  initialDeedId?: string;
  onBackHome: () => void;
  onCheckPlot: (plotId: number) => void;
}

export const VerifyDeedPage: React.FC<VerifyDeedPageProps> = ({
  initialDeedId,
  onBackHome,
  onCheckPlot,
}) => {
  const { lang, t, n } = useI18n();
  const [deedQuery, setDeedQuery] = useState<string>(initialDeedId || 'DL-2024-1001');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchVerification = async (idOrNo: string) => {
    if (!idOrNo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/verify/deed/${encodeURIComponent(idOrNo.trim())}`);
      setResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification(initialDeedId || 'DL-2024-1001');
  }, [initialDeedId]);

  const handleTamperToggle = async (action: 'tamper' | 'restore') => {
    if (!result?.deed?.id) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint =
        action === 'tamper'
          ? `/ledger/tamper/${result.deed.id}`
          : `/ledger/restore/${result.deed.id}`;
      const res = await apiClient.post(endpoint, {});
      setResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const startCameraScan = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        t(
          'আপনার ব্রাউজারে ক্যামেরা সুবিধা চালু নেই। নিচের নমুনা QR বাটনে ক্লিক করুন অথবা দলিল নম্বর লিখুন।',
          'Camera API is not available in this browser. Use a sample QR button or type the deed number below.'
        )
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError(
        t(
          'ক্যামেরা ব্যবহারের অনুমতি পাওয়া যায়নি। নিচের তালিকা থেকে নমুনা দলিল বেছে নিন।',
          'Camera permission denied. Please choose one of the sample QR deeds below.'
        )
      );
    }
  };

  const stopCameraScan = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((tr) => tr.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCameraScan();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Back Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-white font-semibold flex items-center gap-2 hover:bg-gray-100 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{t('পিছনে যান (হোম)', 'Back to Home')}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#5F6B66]">
            {t('দ্রুত ডেমো দলিল:', 'Quick Demo Deeds:')}
          </span>
          <button
            type="button"
            onClick={() => {
              setDeedQuery('DL-2024-1001');
              fetchVerification('DL-2024-1001');
            }}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-[#E6F2EE] text-[#006A4E] font-bold text-sm border border-[#006A4E]/30 cursor-pointer hover:bg-[#006A4E] hover:text-white transition"
          >
            ✔ {t('বৈধ দলিল (DL-2024-1001)', 'Clean Deed (DL-2024-1001)')}
          </button>
          <button
            type="button"
            onClick={() => {
              setDeedQuery('DL-2026-1005');
              fetchVerification('DL-2026-1005');
            }}
            className="min-h-[48px] px-3.5 py-2 rounded-xl bg-[#FEECEE] text-[#C81E32] font-bold text-sm border border-[#F42A41]/40 cursor-pointer hover:bg-[#F42A41] hover:text-white transition"
          >
            ✖ {t('টেম্পারড দলিল (DL-2026-1005)', 'Tampered Deed (DL-2026-1005)')}
          </button>
        </div>
      </div>

      {/* Search / QR Scan Box */}
      <section className="no-print rounded-2xl bg-white border border-gray-200 p-5 sm:p-6 shadow-xs hc-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] flex items-center gap-2.5">
              <QrCode className="w-7 h-7 text-[#006A4E]" />
              <span>
                {t(
                  'QR কোড বা দলিল নম্বর দিয়ে সত্যতা যাচাই করুন',
                  'Verify Deed by QR Scan or Deed Number'
                )}
              </span>
            </h1>
            <p className="text-sm text-[#5F6B66] mt-1">
              {t(
                'লগইন ছাড়াই যেকোনো নাগরিক দলিলের ডিজিটাল স্বাক্ষর ও হ্যাশ-চেইন যাচাই করতে পারবেন।',
                'Public verification works without login — checks SHA-256 hash and Ed25519 signature.'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={cameraActive ? stopCameraScan : startCameraScan}
            className="min-h-[48px] px-4 py-2.5 rounded-xl border-2 border-[#006A4E] text-[#006A4E] font-bold flex items-center justify-center gap-2 hover:bg-[#E6F2EE] cursor-pointer shrink-0"
          >
            <Camera className="w-5 h-5" />
            <span>
              {cameraActive
                ? t('ক্যামেরা বন্ধ করুন', 'Close Camera')
                : t('📷 ক্যামেরা দিয়ে QR স্ক্যান করুন', '📷 Scan QR with Camera')}
            </span>
          </button>
        </div>

        {cameraError && (
          <div className="p-3.5 rounded-xl bg-[#FEF6E7] border border-[#B7791F] text-[#8C580C] text-sm font-medium">
            {cameraError}
          </div>
        )}

        {cameraActive && (
          <div className="p-4 rounded-2xl bg-black/95 text-white flex flex-col items-center gap-3">
            <video
              ref={videoRef}
              className="w-full max-w-sm h-56 object-cover rounded-xl border-2 border-[#006A4E]"
              playsInline
              muted
            />
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  stopCameraScan();
                  setDeedQuery('DL-2024-1001');
                  fetchVerification('DL-2024-1001');
                }}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-sm cursor-pointer"
              >
                {t('নমুনা QR স্ক্যান সিমুলেট করুন (DL-2024-1001)', 'Simulate QR Scan (DL-2024-1001)')}
              </button>
              <button
                type="button"
                onClick={() => {
                  stopCameraScan();
                  setDeedQuery('DL-2026-1005');
                  fetchVerification('DL-2026-1005');
                }}
                className="min-h-[48px] px-4 py-2 rounded-xl bg-[#F42A41] text-white font-bold text-sm cursor-pointer"
              >
                {t('টেম্পারড QR স্ক্যান সিমুলেট করুন (DL-2026-1005)', 'Simulate Tampered QR (DL-2026-1005)')}
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchVerification(deedQuery);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="flex-1">
            <label htmlFor="deed-search-input" className="block text-sm font-bold text-[#1A1A1A] mb-1">
              {t('দলিল নম্বর অথবা দলিল আইডি লিখুন', 'Enter Deed Number or Deed ID')}
            </label>
            <input
              id="deed-search-input"
              type="text"
              value={deedQuery}
              onChange={(e) => setDeedQuery(e.target.value)}
              placeholder={t('যেমন: DL-2024-1001 অথবা DL-2026-1005', 'e.g. DL-2024-1001 or DL-2026-1005')}
              className="w-full min-h-[52px] px-4 py-2.5 rounded-xl border-2 border-gray-300 focus:border-[#006A4E] text-lg font-medium bg-[#FAFBFA]"
            />
          </div>
          <div className="sm:self-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[52px] px-6 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold text-lg hover:bg-[#00563F] transition cursor-pointer"
            >
              {loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('দলিল যাচাই করুন', 'Verify Deed')}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div
          role="alert"
          className="p-5 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-semibold"
        >
          {error}
        </div>
      )}

      {/* Verification Result Hero */}
      {result && (
        <div className="space-y-6">
          <VerdictBanner
            verdict={result.verification.verdict}
            riskScore={result.verification.is_valid ? 0 : 100}
            titleBn={result.verification.message_bn}
            titleEn={result.verification.message_en}
            reasonsBn={result.reasons_bn}
            reasonsEn={result.reasons_en}
            nextStepsBn={result.next_steps_bn}
            nextStepsEn={result.next_steps_en}
            technicalDetails={result.verification}
          />

          {/* Live Demo Moment: Simulate Tampering / Restore Controls */}
          <section className="no-print rounded-2xl bg-white border-2 border-dashed border-[#F42A41]/60 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hc-card">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FEECEE] text-[#C81E32] mb-1">
                <span>🎯 {t('হ্যাকাথন ডেমো ফিচার (Demo-Only)', 'Hackathon Live Demo Feature')}</span>
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">
                {t(
                  'লাইভ টেম্পারিং সিমুলেশন: ডাটাবেজে দলিলের তথ্য পরিবর্তন করে দেখুন',
                  'Live Tamper Simulation: Edit Stored Deed Row & Watch Hash Chain React'
                )}
              </h3>
              <p className="text-sm text-[#5F6B66]">
                {t(
                  'এই বাটনে ক্লিক করলে ব্যাকএন্ড ডাটাবেজে জমির পরিমাণ গোপনে বাড়িয়ে দেওয়া হবে—ফলে তাৎক্ষণিকভাবে SHA-256 হ্যাশ ভেঙে সবুজ (✔) থেকে লাল (✖) হয়ে যাবে।',
                  'Simulates an insider editing the stored deed area after registration. Recomputing the SHA-256 hash immediately exposes the mismatch.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              {result.verification.is_valid ? (
                <button
                  type="button"
                  onClick={() => handleTamperToggle('tamper')}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#F42A41] text-white font-bold flex items-center gap-2 hover:bg-[#D01F34] cursor-pointer shadow-sm"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>
                    {t('Demo: দলিলের তথ্য টেম্পার করুন (+১৫ শতাংশ)', 'Demo: Simulate Tampering (+15 Dec)')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTamperToggle('restore')}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold flex items-center gap-2 hover:bg-[#00563F] cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>
                    {t('Demo: মূল বৈধ দলিল পুনরুদ্ধার করুন (Restore)', 'Demo: Restore Original Signed Deed')}
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Deed Summary Card + QR Code */}
          <section className="rounded-2xl bg-white border border-gray-200 p-6 shadow-xs hc-card grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div>
                  <span className="text-xs font-bold uppercase text-[#5F6B66]">
                    {t('নিবন্ধিত দলিলের বিবরণ', 'Registered Deed Details')}
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1A1A]">
                    {t('দলিল নং:', 'Deed No:')} {result.deed.deed_no}{' '}
                    <span className="text-sm font-semibold text-[#006A4E]">
                      ({t('চেইন ইনডেক্স', 'Chain Index')} #{n(result.deed.chain_index)})
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print min-h-[44px] px-3.5 py-1.5 rounded-xl border border-gray-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-gray-100 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t('প্রিন্ট করুন', 'Print')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
                <div className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200">
                  <div className="text-xs font-bold text-[#5F6B66]">
                    {t('বিক্রেতা (Seller)', 'Seller (Transferor)')}
                  </div>
                  <div className="font-bold text-[#1A1A1A] mt-0.5">
                    {t(result.seller?.name_bn || '', result.seller?.name_en || '')}
                  </div>
                  <div className="text-xs text-[#5F6B66] mt-0.5">
                    {t('ডেমো এনআইডি:', 'Mock NID:')} {n(result.seller?.nid)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200">
                  <div className="text-xs font-bold text-[#5F6B66]">
                    {t('ক্রেতা (Buyer)', 'Buyer (Transferee)')}
                  </div>
                  <div className="font-bold text-[#1A1A1A] mt-0.5">
                    {t(result.buyer?.name_bn || '', result.buyer?.name_en || '')}
                  </div>
                  <div className="text-xs text-[#5F6B66] mt-0.5">
                    {t('ডেমো এনআইডি:', 'Mock NID:')} {n(result.buyer?.nid)}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200">
                  <div className="text-xs font-bold text-[#5F6B66]">
                    {t('মৌজা ও দাগ নম্বর', 'Mouza & Plot (Dag)')}
                  </div>
                  <div className="font-bold text-[#1A1A1A] mt-0.5">
                    {t(result.location?.mouza_bn || '', result.location?.mouza_en || '')} —{' '}
                    {t('দাগ নং', 'Dag')} {n(result.plot?.dag_no)}
                  </div>
                  <div className="text-xs text-[#5F6B66] mt-0.5">
                    {t('বিএস খতিয়ান:', 'BS Khatian:')} {n(result.bs_khatian?.khatian_no)}
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    result.verification.is_valid
                      ? 'bg-[#FAFBFA] border-gray-200'
                      : 'bg-[#FEECEE] border-[#F42A41]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#5F6B66]">
                    {t('হস্তান্তরিত জমির পরিমাণ ও মূল্য', 'Transferred Area & Value')}
                  </div>
                  <div className="font-bold text-[#1A1A1A] mt-0.5">
                    {n(result.deed.area_decimal)} {t('শতাংশ', 'Decimals')} ({n(result.deed.share_fraction)}{' '}
                    {t('অংশ', 'Share')})
                  </div>
                  {!result.verification.is_valid && (
                    <div className="text-xs font-bold text-[#C81E32] mt-0.5">
                      {t(
                        `মূল স্বাক্ষরিত পরিমাণ ছিল: ${n(result.deed.original_area_decimal)} শতাংশ!`,
                        `Originally signed for: ${result.deed.original_area_decimal} Decimals!`
                      )}
                    </div>
                  )}
                  <div className="text-xs text-[#5F6B66] mt-0.5">
                    {formatCurrency(result.deed.price_bdt, lang)}
                  </div>
                </div>
              </div>

              {/* Cryptographic Hash Visual Comparison */}
              <div className="p-4 rounded-xl bg-[#FAFBFA] border border-gray-200 space-y-2 text-xs font-mono">
                <div className="font-sans text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                  <span>
                    {t(
                      'ক্রিপ্টোগ্রাফিক হ্যাশ ও Ed25519 ডিজিটাল স্বাক্ষর তুলনা',
                      'Cryptographic SHA-256 Hash & Ed25519 Signature Verification'
                    )}
                  </span>
                </div>
                <div className="break-all">
                  <span className="font-bold text-[#5F6B66]">
                    {t('লেজারে সংরক্ষিত হ্যাশ (Stored): ', 'Stored Ledger Hash: ')}
                  </span>
                  <span className="text-[#006A4E]">{result.verification.stored_hash}</span>
                </div>
                <div className="break-all">
                  <span className="font-bold text-[#5F6B66]">
                    {t('বর্তমান তথ্য হতে গণনাকৃত হ্যাশ (Recomputed): ', 'Recomputed Hash: ')}
                  </span>
                  <span
                    className={
                      result.verification.hash_valid
                        ? 'text-[#006A4E] font-bold'
                        : 'text-[#F42A41] font-bold underline'
                    }
                  >
                    {result.verification.recomputed_hash}
                  </span>
                </div>
                <div className="break-all">
                  <span className="font-bold text-[#5F6B66]">
                    {t('পূর্ববর্তী দলিলের হ্যাশ (prev_hash): ', 'Previous Deed Hash (prev_hash): ')}
                  </span>
                  <span>{result.verification.prev_hash}</span>
                </div>
              </div>

              {result.plot?.id && (
                <div className="no-print pt-2">
                  <button
                    type="button"
                    onClick={() => onCheckPlot(result.plot.id)}
                    className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold text-sm hover:bg-[#00563F] cursor-pointer"
                  >
                    🔎{' '}
                    {t(
                      `এই দাগের (${n(result.plot.dag_no)}) সম্পূর্ণ মালিকানা ও ঝুঁকি রিপোর্ট দেখুন`,
                      `Open Full 'Check Before You Buy' Report for Dag ${result.plot.dag_no}`
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Official QR Verification Card */}
            <div className="rounded-2xl bg-[#E6F2EE] border border-[#006A4E]/30 p-5 flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-sm font-bold text-[#006A4E]">
                {t('পাবলিক যাচাই কিউআর কোড', 'Public Verification QR Code')}
              </div>
              {result.qr_svg_data_uri && (
                <img
                  src={result.qr_svg_data_uri}
                  alt={`QR Code for ${result.deed.deed_no}`}
                  className="w-44 h-44 bg-white p-2 rounded-2xl border border-gray-300 shadow-xs"
                />
              )}
              <div className="text-xs text-[#5F6B66] break-all px-2">{result.verify_url}</div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white text-[#006A4E]">
                {t('লগইন ছাড়াই যেকোনো ফোনে স্ক্যানযোগ্য', 'Scannable on any phone without login')}
              </span>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
