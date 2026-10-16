import React, { useEffect, useState } from 'react';
import { FileCheck2, ShieldAlert, CheckCircle2, QrCode } from 'lucide-react';
import { apiClient, extractErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { VerdictBanner } from '../components/VerdictBanner';

interface SubRegistrarPageProps {
  initialScenario?: any;
  onOpenDeedVerify: (deedNo: string) => void;
}

export const SubRegistrarPage: React.FC<SubRegistrarPageProps> = ({
  initialScenario,
  onOpenDeedVerify,
}) => {
  const { lang, t, n } = useI18n();
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);

  const [plotId, setPlotId] = useState<number>(initialScenario?.plot_id || 1);
  const [sellerId, setSellerId] = useState<number>(initialScenario?.seller_id || 1);
  const [buyerId, setBuyerId] = useState<number>(initialScenario?.buyer_id || 2);
  const [areaDecimal, setAreaDecimal] = useState<string>(
    String(initialScenario?.requested_area_decimal || 10)
  );
  const [priceBdt, setPriceBdt] = useState<string>('1800000');
  const [sellerNid, setSellerNid] = useState<string>('');
  const [checkRapid, setCheckRapid] = useState<boolean>(true);

  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [registeredDeed, setRegisteredDeed] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/locations'),
      apiClient.get('/persons'),
      apiClient.get('/scenarios'),
    ])
      .then(([locRes, perRes, scRes]) => {
        setPlots(locRes.data.plots || []);
        setPersons(perRes.data.items || []);
        setScenarios(scRes.data.items || []);
      })
      .catch(() => {});
  }, []);

  const runPreCheck = async (
    pId = plotId,
    sId = sellerId,
    bId = buyerId,
    area = areaDecimal,
    nidOverride = sellerNid
  ) => {
    setLoading(true);
    setError(null);
    setRegisteredDeed(null);
    try {
      const res = await apiClient.post('/registrar/pre-check', {
        plot_id: Number(pId),
        seller_id: Number(sId),
        buyer_id: Number(bId),
        requested_area_decimal: Number(area),
        price_bdt: Number(priceBdt),
        seller_nid: nidOverride.trim() || null,
        check_rapid_resale: checkRapid,
      });
      setCheckResult(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialScenario) {
      setPlotId(initialScenario.plot_id);
      setSellerId(initialScenario.seller_id);
      setBuyerId(initialScenario.buyer_id);
      setAreaDecimal(String(initialScenario.requested_area_decimal));
      runPreCheck(
        initialScenario.plot_id,
        initialScenario.seller_id,
        initialScenario.buyer_id,
        String(initialScenario.requested_area_decimal),
        initialScenario.seller_nid_override || ''
      );
    }
  }, [initialScenario]);

  const handleRegisterDeed = async (forceHold: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/registrar/register-deed', {
        plot_id: Number(plotId),
        seller_id: Number(sellerId),
        buyer_id: Number(buyerId),
        requested_area_decimal: Number(areaDecimal),
        price_bdt: Number(priceBdt),
        seller_nid: sellerNid.trim() || null,
        check_rapid_resale: checkRapid,
        force_hold: forceHold,
      });
      setRegisteredDeed(res.data);
    } catch (err) {
      setError(extractErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + 1-Click Scenario Presets */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs space-y-4 hc-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#E6F2EE] text-[#006A4E]">
              {t('সাব-রেজিস্ট্রার ড্যাশবোর্ড (আইন মন্ত্রণালয়)', 'Sub-Registrar Office (Ministry of Law)')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mt-2 flex items-center gap-2.5">
              <FileCheck2 className="w-8 h-8 text-[#006A4E]" />
              <span>
                {t(
                  'প্রাক-নিবন্ধন দলিল ও মালিকানা চেইন যাচাই উইজার্ড',
                  'Pre-Registration Deed & Ownership Chain Verification Wizard'
                )}
              </span>
            </h1>
            <p className="text-sm text-[#5F6B66] mt-1">
              {t(
                'দলিল নিবন্ধনের পূর্বেই বিক্রেতার মালিকানা, অংশ, পূর্ববর্তী ডাবল সেল, ব্যাংক বন্ধক এবং এনআইডি যাচাই করুন।',
                'Check seller ownership, share fraction, double sales, active bank liens, and Mock NID before registering a deed.'
              )}
            </p>
          </div>
        </div>

        {/* Quick Preset Buttons for Scenarios 1..8 */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-xs font-bold uppercase text-[#5F6B66] mb-2">
            {t(
              'ডেমো সিনারিও এক ক্লিকে ফর্মে লোড করুন:',
              '1-Click Load Hackathon Scenarios into Wizard:'
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => {
                  setPlotId(sc.plot_id);
                  setSellerId(sc.seller_id);
                  setBuyerId(sc.buyer_id);
                  setAreaDecimal(String(sc.requested_area_decimal));
                  setSellerNid('');
                  runPreCheck(
                    sc.plot_id,
                    sc.seller_id,
                    sc.buyer_id,
                    String(sc.requested_area_decimal),
                    ''
                  );
                }}
                className={`min-h-[44px] px-3.5 py-1.5 rounded-xl font-bold text-xs border cursor-pointer transition ${
                  sc.expected_verdict === 'SAFE'
                    ? 'bg-[#E6F2EE] text-[#006A4E] border-[#006A4E]/30 hover:bg-[#006A4E] hover:text-white'
                    : sc.expected_verdict === 'REVIEW'
                    ? 'bg-[#FEF6E7] text-[#8C580C] border-[#B7791F]/40 hover:bg-[#B7791F] hover:text-white'
                    : 'bg-[#FEECEE] text-[#C81E32] border-[#F42A41]/40 hover:bg-[#F42A41] hover:text-white'
                }`}
              >
                {t(`সিনারিও ${n(sc.scenario_no)}: ${sc.badge_bn}`, `Scenario ${sc.scenario_no}: ${sc.code}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Pre-Registration Check Input Form */}
      <section className="rounded-3xl bg-white border border-gray-200 p-6 shadow-xs hc-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runPreCheck();
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label htmlFor="sr-plot" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('১. মৌজা ও দাগ নম্বর (Plot / Dag)', '1. Select Mouza & Plot (Dag)')}
            </label>
            <select
              id="sr-plot"
              value={plotId}
              onChange={(e) => setPlotId(Number(e.target.value))}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'bn'
                    ? `${p.mouza_bn} — দাগ ${p.dag_no_bn} (${n(p.total_area_decimal)} শতাংশ)`
                    : `${p.mouza_en} — Dag ${p.dag_no} (${p.total_area_decimal} Dec)`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sr-seller" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('২. বিক্রেতা (Seller / দাতা)', '2. Seller (Transferor)')}
            </label>
            <select
              id="sr-seller"
              value={sellerId}
              onChange={(e) => setSellerId(Number(e.target.value))}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            >
              {persons.map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn'
                    ? `${per.name_bn} (এনআইডি: ${n(per.nid)})`
                    : `${per.name_en} (NID: ${per.nid})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sr-buyer" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('৩. ক্রেতা (Buyer / গ্রহীতা)', '3. Buyer (Transferee)')}
            </label>
            <select
              id="sr-buyer"
              value={buyerId}
              onChange={(e) => setBuyerId(Number(e.target.value))}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            >
              {persons.map((per) => (
                <option key={per.id} value={per.id}>
                  {lang === 'bn'
                    ? `${per.name_bn} (এনআইডি: ${n(per.nid)})`
                    : `${per.name_en} (NID: ${per.nid})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sr-area" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('৪. হস্তান্তরিত জমি (শতাংশ / Decimal)', '4. Area to Transfer (Decimals)')}
            </label>
            <input
              id="sr-area"
              type="number"
              step="0.25"
              min="0.25"
              value={areaDecimal}
              onChange={(e) => setAreaDecimal(e.target.value)}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            />
          </div>

          <div>
            <label htmlFor="sr-price" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t('৫. দলিলের মূল্য (টাকা / BDT)', '5. Consideration Value (BDT)')}
            </label>
            <input
              id="sr-price"
              type="number"
              step="10000"
              value={priceBdt}
              onChange={(e) => setPriceBdt(e.target.value)}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            />
          </div>

          <div>
            <label htmlFor="sr-nid" className="block text-sm font-bold text-[#1A1A1A] mb-1.5">
              {t(
                '৬. বিক্রেতার এনআইডি যাচাই (ঐচ্ছিক ভুল এনআইডি টেস্ট)',
                '6. Seller NID Check (Leave blank or test mismatch)'
              )}
            </label>
            <input
              id="sr-nid"
              type="text"
              value={sellerNid}
              onChange={(e) => setSellerNid(e.target.value)}
              placeholder={t('স্বয়ংক্রিয় বা ভুল এনআইডি লিখুন (যেমন 9999)', 'Blank for auto or enter wrong NID')}
              className="w-full min-h-[50px] px-3.5 py-2 rounded-xl border-2 border-gray-300 bg-[#FAFBFA] font-semibold"
            />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] cursor-pointer">
              <input
                type="checkbox"
                checked={checkRapid}
                onChange={(e) => setCheckRapid(e.target.checked)}
                className="w-5 h-5 accent-[#006A4E]"
              />
              <span>
                {t(
                  'দ্রুত হাতবদল (৩০ দিনের মধ্যে পুনরায় বিক্রয়) নিয়ম সক্রিয় রাখুন',
                  'Enable Rapid Resale (< 30 days) check'
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[52px] px-7 py-3 rounded-xl bg-[#006A4E] text-white font-bold text-lg hover:bg-[#00563F] transition cursor-pointer shadow-sm"
            >
              {loading
                ? t('যাচাই করা হচ্ছে...', 'Running Fraud Rules...')
                : t('🔍 নিবন্ধন-পূর্ব ঝুঁকি যাচাই করুন', '🔍 Run Pre-Registration Check')}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="p-5 rounded-2xl bg-[#FEECEE] border-2 border-[#F42A41] text-[#C81E32] font-semibold">
          {error}
        </div>
      )}

      {/* Pre-Check Verdict & Officer Decision Actions */}
      {checkResult && (
        <div className="space-y-6">
          <VerdictBanner
            verdict={checkResult.risk_report.verdict}
            riskScore={checkResult.risk_report.risk_score}
            titleBn={checkResult.risk_report.summary_bn}
            titleEn={checkResult.risk_report.summary_en}
            reasonsBn={
              checkResult.risk_report.flags.length > 0
                ? checkResult.risk_report.flags.map((f: any) => `[${f.rule_id}] ${f.title_bn} — ${f.message_bn}`)
                : [
                    `বিক্রেতা (${checkResult.seller.name_bn}) সর্বশেষ বিএস খতিয়ানের বৈধ মালিক।`,
                    `হস্তান্তরিত জমি (${n(areaDecimal)} শতাংশ) বিক্রেতার প্রাপ্য অংশের মধ্যে রয়েছে।`,
                    `কোনো ডাবল সেল, ব্যাংক বন্ধক বা খতিয়ান চেইন ব্রেক পাওয়া যায়নি।`,
                  ]
            }
            reasonsEn={
              checkResult.risk_report.flags.length > 0
                ? checkResult.risk_report.flags.map((f: any) => `[${f.rule_id}] ${f.title_en} — ${f.message_en}`)
                : [
                    `Seller (${checkResult.seller.name_en}) is verified on the latest BS Khatian.`,
                    `Requested area (${areaDecimal} decimals) is within available owned share.`,
                    `Zero double-sale, mortgage lien, or survey chain discrepancies.`,
                  ]
            }
            nextStepsBn={checkResult.risk_report.next_steps_bn}
            nextStepsEn={checkResult.risk_report.next_steps_en}
            technicalDetails={checkResult.risk_report}
          />

          {/* Sub-Registrar Action Card: Approve & Sign Deed vs Hold */}
          <section className="rounded-2xl bg-white border-2 border-[#006A4E]/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hc-card">
            <div>
              <h3 className="text-xl font-bold text-[#1A1A1A]">
                {t('সাব-রেজিস্ট্রারের চূড়ান্ত সিদ্ধান্ত (মানব কর্মকর্তা)', 'Sub-Registrar Officer Decision')}
              </h3>
              <p className="text-sm text-[#5F6B66]">
                {t(
                  'নিবন্ধন অনুমোদন করলে Ed25519 ডিজিটাল স্বাক্ষর ও QR কোডসহ হ্যাশ-চেইন লেজারে দলিল যুক্ত হবে এবং এসি ল্যান্ডের নিকট ই-নামজারি কেস যাবে।',
                  'Approving signs the deed with Ed25519, appends it to the hash chain with a QR code, and queues an AC Land e-Mutation case.'
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleRegisterDeed(true)}
                className="min-h-[50px] px-5 py-2.5 rounded-xl bg-[#F42A41] text-white font-bold flex items-center gap-2 hover:bg-[#D01F34] cursor-pointer"
              >
                <ShieldAlert className="w-5 h-5" />
                <span>{t('স্থগিত রাখুন (Hold / Block)', 'Place on HOLD')}</span>
              </button>

              {checkResult.risk_report.verdict !== 'HIGH_RISK' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleRegisterDeed(false)}
                  className="min-h-[50px] px-6 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold flex items-center gap-2 hover:bg-[#00563F] cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    {t(
                      '✔ অনুমোদন ও ডিজিটাল স্বাক্ষরসহ নিবন্ধন করুন',
                      '✔ Approve & Register Signed Deed'
                    )}
                  </span>
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Newly Registered Signed Deed & QR Receipt */}
      {registeredDeed && (
        <section className="rounded-3xl bg-[#E6F2EE] border-2 border-[#006A4E] p-6 shadow-md grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-[#006A4E] text-white text-xs font-bold">
              {registeredDeed.status === 'HELD'
                ? t('✖ স্থগিত (HELD)', '✖ HELD FOR FRAUD RISK')
                : t('✔ হ্যাশ-চেইন লেজারে নিবন্ধিত', '✔ APPENDED TO HASH-CHAIN LEDGER')}
            </span>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">
              {t(registeredDeed.message_bn, registeredDeed.message_en)}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-white p-4 rounded-2xl border border-gray-200">
              <div>
                <span className="text-[#5F6B66] font-bold">{t('দলিল নম্বর:', 'Deed No:')}</span>{' '}
                <span className="font-bold">{registeredDeed.deed_no}</span>
              </div>
              <div>
                <span className="text-[#5F6B66] font-bold">{t('চেইন ইনডেক্স:', 'Chain Index:')}</span>{' '}
                <span className="font-bold">#{n(registeredDeed.chain_index)}</span>
              </div>
              <div className="sm:col-span-2 break-all font-mono text-xs">
                <span className="text-[#5F6B66] font-bold">SHA-256 Hash: </span>
                <span className="text-[#006A4E]">{registeredDeed.content_hash}</span>
              </div>
              <div className="sm:col-span-2 break-all font-mono text-xs">
                <span className="text-[#5F6B66] font-bold">Ed25519 Signature: </span>
                <span>{registeredDeed.signature}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenDeedVerify(registeredDeed.deed_no)}
              className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#006A4E] text-white font-bold text-sm flex items-center gap-2 hover:bg-[#00563F] cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>{t('পাবলিক ভেরিফিকেশন পেজে খুলুন', 'Open Public Verification Page')}</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-gray-200">
            <img
              src={registeredDeed.qr_svg_data_uri}
              alt="Signed Deed QR"
              className="w-36 h-36"
            />
            <span className="text-xs font-bold text-[#006A4E] mt-2">
              {t('দলিলের কিউআর কোড', 'Deed Verification QR')}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};
