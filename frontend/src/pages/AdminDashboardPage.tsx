import React, { useEffect, useState } from 'react';
import {
  Shield,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  ScanText,
  History,
  Play,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { getVerdictStyle } from '../theme/tokens';
import { ActiveTab } from '../components/NavbarAndLayout';

interface AdminDashboardPageProps {
  onJumpScenario: (scenario: any, targetTab: ActiveTab) => void;
  onOpenDeedVerify: (deedNo: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onJumpScenario,
  onOpenDeedVerify,
}) => {
  const { lang, t, n } = useI18n();
  const [ledger, setLedger] = useState<any | null>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [ocrResult, setOcrResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ledRes, scRes, audRes] = await Promise.all([
        apiClient.get('/ledger/verify?limit=15'),
        apiClient.get('/scenarios'),
        apiClient.get('/audit-log'),
      ]);
      setLedger(ledRes.data);
      setScenarios(scRes.data.items || []);
      setAuditLogs(audRes.data.items || []);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleTamperOrRestore = async (deedId: number, mode: 'tamper' | 'restore') => {
    setLoading(true);
    try {
      await apiClient.post(`/ledger/${mode}/${deedId}`, {});
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const runOcrDemo = async (presetId: string) => {
    try {
      const res = await apiClient.post('/ocr/khatian-demo', { preset_id: presetId });
      setOcrResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Cryptographic Hash-Chain Ledger Integrity Banner */}
      {ledger && (
        <section
          className={`rounded-3xl border-2 p-6 shadow-sm hc-card ${
            ledger.is_valid
              ? 'bg-[#E6F2EE] border-[#006A4E]'
              : 'bg-[#FEECEE] border-[#F42A41]'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white bg-[#1A1A1A]">
                <Shield className="w-4 h-4" />
                <span>
                  {t(
                    'হ্যাশ-চেইন লেজার ও ডেইলি মার্কেল রুট অডিট (P1 + P5)',
                    'Tamper-Evident Hash-Chain Ledger & Daily Merkle Root Anchor'
                  )}
                </span>
              </div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  ledger.is_valid ? 'text-[#006A4E]' : 'text-[#C81E32]'
                }`}
              >
                {ledger.is_valid
                  ? `✔ ${t(ledger.message_bn, ledger.message_en)}`
                  : `✖ ${t(ledger.message_bn, ledger.message_en)}`}
              </h1>
              <div className="text-xs font-mono text-[#1A1A1A] break-all space-y-1">
                <div>
                  <strong>Daily Merkle Root (SHA-256):</strong> {ledger.merkle_root}
                </div>
                <div>
                  <strong>Registrar Ed25519 Public Key:</strong> {ledger.public_key_hex}
                </div>
              </div>
            </div>

            {/* Dramatic Live Demo Button: Toggle Deed #5 Tamper / Restore */}
            <div className="flex flex-wrap gap-3 shrink-0">
              {ledger.is_valid ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTamperOrRestore(5, 'tamper')}
                  className="min-h-[52px] px-5 py-3 rounded-xl bg-[#F42A41] text-white font-bold flex items-center gap-2 hover:bg-[#D01F34] cursor-pointer shadow-sm"
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>
                    {t(
                      'Demo: দলিল #৫ টেম্পার করুন (হ্যাশ চেইন ভাঙুন)',
                      'Demo: Simulate Tampering on Deed #5'
                    )}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleTamperOrRestore(ledger.first_broken_deed_id || 5, 'restore')}
                  className="min-h-[52px] px-5 py-3 rounded-xl bg-[#006A4E] text-white font-bold flex items-center gap-2 hover:bg-[#00563F] cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>
                    {t(
                      `Demo: দলিল (${ledger.first_broken_deed_no}) পুনরুদ্ধার করে লেজার সবুজ (✔) করুন`,
                      `Demo: Restore ${ledger.first_broken_deed_no} & Heal Hash Chain (✔)`
                    )}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Chain Visualizer Cards */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ledger.chain_sample?.slice(0, 6).map((block: any) => (
              <div
                key={block.id}
                className={`p-4 rounded-2xl border-2 bg-white flex flex-col justify-between gap-2 ${
                  block.is_valid ? 'border-[#006A4E]/40' : 'border-[#F42A41] ring-2 ring-[#F42A41]/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#1A1A1A]">
                      #{n(block.chain_index)} • {block.deed_no}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        block.is_valid
                          ? 'bg-[#E6F2EE] text-[#006A4E]'
                          : 'bg-[#F42A41] text-white'
                      }`}
                    >
                      {block.is_valid ? t('✔ অক্ষুণ্ণ', '✔ Intact') : t('✖ পরিবর্তিত!', '✖ Tampered!')}
                    </span>
                  </div>
                  <div className="text-xs text-[#5F6B66] mt-1">
                    {t('জমি:', 'Area:')} {n(block.area_decimal)} {t('শতাংশ', 'Dec')}
                    {!block.is_valid && (
                      <span className="text-[#C81E32] font-bold ml-1">
                        ({t(`মূল: ${n(block.original_area_decimal)}`, `Orig: ${block.original_area_decimal}`)})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-[#5F6B66] truncate mt-1">
                    H: {block.recomputed_hash.slice(0, 20)}...
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onOpenDeedVerify(block.deed_no)}
                    className="text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                  >
                    {t('QR ও বিস্তারিত দেখুন →', 'Inspect Deed & QR ->')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleTamperOrRestore(block.id, block.is_valid ? 'tamper' : 'restore')
                    }
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer ${
                      block.is_valid
                        ? 'bg-[#FEECEE] text-[#C81E32]'
                        : 'bg-[#E6F2EE] text-[#006A4E]'
                    }`}
                  >
                    {block.is_valid ? t('টেম্পার করুন', 'Tamper') : t('পুনরুদ্ধার করুন', 'Restore')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-[#FEECEE] border border-[#F42A41] text-[#C81E32] font-bold">
          {error}
        </div>
      )}

      {/* 2. All 8 Seeded Hackathon Demo Scenarios Switcher */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {t(
                'হ্যাকাথনের ৮টি প্রাক-নির্মিত ডেমো সিনারিও সুইচার',
                '8 Hackathon Demo Scenarios Switcher (Live Verdicts)'
              )}
            </h2>
            <p className="text-sm text-[#5F6B66]">
              {t(
                'প্রতিটি সিনারিওর প্রত্যাশিত ফলাফল ও রুল ইঞ্জিনের বর্তমান লাইভ স্ট্যাটাস নিচে দেখানো হলো।',
                'All 8 required scenarios with expected vs. live rule engine verdicts.'
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((sc) => {
            const st = getVerdictStyle(sc.live_verdict);
            return (
              <div
                key={sc.id}
                className={`p-5 rounded-2xl border-2 ${st.border} ${st.softBg} flex flex-col justify-between gap-3`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-3 py-0.5 rounded-full text-xs font-bold text-white ${st.bg}`}>
                      {t(sc.badge_bn, sc.badge_en)}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#5F6B66]">{sc.code}</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#1A1A1A]">
                    {t(sc.title_bn, sc.title_en)}
                  </h3>
                  <p className="text-sm text-[#1A1A1A]/90 leading-relaxed">
                    {t(sc.description_bn, sc.description_en)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onJumpScenario(sc, 'registrar')}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-[#006A4E] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#00563F] cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{t('সাব-রেজিস্ট্রার উইজার্ডে টেস্ট করুন', 'Test in Sub-Registrar')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onJumpScenario(sc, 'check_buy')}
                    className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-gray-300 text-[#1A1A1A] font-bold text-xs hover:bg-gray-100 cursor-pointer"
                  >
                    {t('নাগরিক রিপোর্টে দেখুন', 'Citizen Report')}
                  </button>
                  {sc.deed_id && (
                    <button
                      type="button"
                      onClick={() => onOpenDeedVerify(String(sc.deed_id))}
                      className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-white border border-[#006A4E] text-[#006A4E] font-bold text-xs hover:bg-[#E6F2EE] cursor-pointer"
                    >
                      {t('দলিলের QR যাচাই', 'Verify Deed QR')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Stretch Goal P5: Bangla Khatian OCR Digitization Demo */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#E6F2EE] text-[#006A4E]">
              {t('P5 স্ট্রেচ ফিচার — বাংলা ওসিআর (Tesseract ben)', 'P5 Stretch Goal — Bangla Khatian OCR')}
            </span>
            <h2 className="text-xl font-bold text-[#1A1A1A] mt-1 flex items-center gap-2">
              <ScanText className="w-6 h-6 text-[#006A4E]" />
              <span>
                {t(
                  'ডামি খতিয়ান স্ক্যান হতে স্বয়ংক্রিয় বাংলা ফিল্ড এক্সট্রাকশন (OCR)',
                  'Automated Bangla Khatian Scan OCR into Structured Fields'
                )}
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runOcrDemo('bs_4101')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#006A4E] text-white font-bold text-xs cursor-pointer"
            >
              {t('বিএস খতিয়ান ৪১০১ স্ক্যান ওসিআর করুন', 'Run OCR on BS Khatian 4101')}
            </button>
            <button
              type="button"
              onClick={() => runOcrDemo('bs_4107_mismatch')}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#B7791F] text-white font-bold text-xs cursor-pointer"
            >
              {t('বিএস খতিয়ান ৪১০৭ (চেইন ব্রেক) ওসিআর করুন', 'Run OCR on BS Khatian 4107')}
            </button>
          </div>
        </div>

        {ocrResult && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-[#FAFBFA] border border-gray-200">
              <div className="text-xs font-bold text-[#5F6B66] mb-1">
                {t('ওসিআর হতে প্রাপ্ত বাংলা টেক্সট:', 'Raw Extracted Bangla OCR Text:')}
              </div>
              <pre className="whitespace-pre-wrap text-sm font-sans text-[#1A1A1A] leading-relaxed">
                {ocrResult.raw_ocr_text_bn}
              </pre>
            </div>
            <div className="p-4 rounded-2xl bg-[#E6F2EE] border border-[#006A4E]/30 space-y-1 text-sm">
              <div className="text-xs font-bold text-[#006A4E]">
                {t('স্ট্রাকচার্ড ডাটাবেজ ফিল্ড (Confidence: ৯৭%):', 'Structured Model Fields (Confidence: 97%):')}
              </div>
              <div>
                <strong>{t('জরিপ ও খতিয়ান:', 'Survey & Khatian:')}</strong>{' '}
                {ocrResult.extracted_fields.survey_type} #{ocrResult.extracted_fields.khatian_no_bn}
              </div>
              <div>
                <strong>{t('মৌজা ও দাগ:', 'Mouza & Dag:')}</strong>{' '}
                {ocrResult.extracted_fields.mouza_bn}, দাগ {ocrResult.extracted_fields.dag_no_bn}
              </div>
              <div>
                <strong>{t('মালিক ও অংশ:', 'Owner & Share:')}</strong>{' '}
                {ocrResult.extracted_fields.owner_name_bn} ({ocrResult.extracted_fields.share_fraction})
              </div>
              <div>
                <strong>{t('জমির পরিমাণ:', 'Area:')}</strong>{' '}
                {n(ocrResult.extracted_fields.area_decimal)} {t('শতাংশ', 'Decimals')}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Append-Only Hash-Chained Audit Log Viewer */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
          <History className="w-6 h-6 text-[#006A4E]" />
          <span>
            {t(
              'অ্যাপেন্ড-অনলি হ্যাশ-চেইন অডিট লগ (Append-Only Audit Log)',
              'Append-Only Hash-Chained Audit Log'
            )}
          </span>
        </h2>
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-[#FAFBFA] border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#006A4E]">#{n(log.chain_index)}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-200 font-bold text-[#1A1A1A]">
                    {log.action}
                  </span>
                  <span className="text-[#5F6B66]">
                    {log.actor_username} ({log.actor_role})
                  </span>
                </div>
                <div className="text-[#1A1A1A]">
                  {log.details?.note_bn || JSON.stringify(log.details)}
                </div>
              </div>
              <div className="font-mono text-[11px] text-[#5F6B66] shrink-0">
                <div>Hash: {log.entry_hash.slice(0, 16)}...</div>
                <div>Prev: {log.prev_hash.slice(0, 16)}...</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
