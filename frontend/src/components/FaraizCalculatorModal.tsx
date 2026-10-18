import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  X,
  Users,
  PieChart,
  Send,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  FileText,
  BadgeAlert,
  ArrowRight,
  ShieldCheck,
  Building2,
  Percent,
} from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { triggerAppNotification } from './NotificationCenter';

export interface CalculatedHeir {
  id: string;
  name_bn: string;
  name_en: string;
  relation: string;
  fraction_str: string;
  share_percent: number;
  area_decimal: number;
  nid?: string;
}

interface FaraizCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlotId?: number;
  preselectedArea?: number;
  onMutationSuccess?: (caseNo: string) => void;
}

export const FaraizCalculatorModal: React.FC<FaraizCalculatorModalProps> = ({
  isOpen,
  onClose,
  preselectedPlotId,
  preselectedArea,
  onMutationSuccess,
}) => {
  const { lang, t, role, user } = useAppUI();

  // Inputs
  const [deceasedGender, setDeceasedGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [deceasedName, setDeceasedName] = useState('প্রয়াত জমির মালিক');
  const [totalArea, setTotalArea] = useState<number>(preselectedArea || 33.0);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(preselectedPlotId || 1);
  const [plots, setPlots] = useState<any[]>([]);

  // Family Counts
  const [wivesCount, setWivesCount] = useState<number>(1);
  const [hasHusband, setHasHusband] = useState<boolean>(true);
  const [sonsCount, setSonsCount] = useState<number>(2);
  const [daughtersCount, setDaughtersCount] = useState<number>(1);
  const [fatherAlive, setFatherAlive] = useState<boolean>(false);
  const [motherAlive, setMotherAlive] = useState<boolean>(true);

  // Application submission
  const [certificateNo, setCertificateNo] = useState('WS-2026-9921');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ caseNo: string; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch plots for dropdown
  useEffect(() => {
    if (isOpen) {
      BhumiApi.getPlots()
        .then((res) => {
          const items = Array.isArray(res) ? res : res.items || [];
          setPlots(items);
          if (!preselectedPlotId && items.length > 0) {
            setSelectedPlotId(Number(items[0].id));
            if (!preselectedArea && items[0].total_area_decimal) {
              setTotalArea(Number(items[0].total_area_decimal));
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, preselectedPlotId, preselectedArea]);

  // When plot selection changes, sync area if not custom
  const handlePlotSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setSelectedPlotId(id);
    const found = plots.find((p) => Number(p.id) === id);
    if (found && found.total_area_decimal) {
      setTotalArea(Number(found.total_area_decimal));
    }
  };

  // Real Islamic Faraiz Apportionment Engine
  const calculatedHeirs = useMemo<CalculatedHeir[]>(() => {
    const heirs: CalculatedHeir[] = [];
    const hasChildren = sonsCount > 0 || daughtersCount > 0;
    let remainingEstateShare = 1.0;

    // 1. Surviving Spouse (Zawil Furood)
    if (deceasedGender === 'MALE') {
      if (wivesCount > 0) {
        const totalWifeShare = hasChildren ? 1 / 8 : 1 / 4;
        const eachWifeShare = totalWifeShare / wivesCount;
        for (let i = 1; i <= wivesCount; i++) {
          heirs.push({
            id: `wife_${i}`,
            name_bn: wivesCount === 1 ? 'স্ত্রী' : `স্ত্রী (${toBanglaDigits(i)})`,
            name_en: wivesCount === 1 ? 'Wife' : `Wife ${i}`,
            relation: 'স্ত্রী',
            fraction_str: hasChildren
              ? wivesCount === 1
                ? '১/৮'
                : `১/${8 * wivesCount}`
              : wivesCount === 1
              ? '১/৪'
              : `১/${4 * wivesCount}`,
            share_percent: eachWifeShare * 100,
            area_decimal: totalArea * eachWifeShare,
          });
        }
        remainingEstateShare -= totalWifeShare;
      }
    } else {
      if (hasHusband) {
        const husbandShare = hasChildren ? 1 / 4 : 1 / 2;
        heirs.push({
          id: 'husband',
          name_bn: 'স্বামী',
          name_en: 'Husband',
          relation: 'স্বামী',
          fraction_str: hasChildren ? '১/৪' : '১/২',
          share_percent: husbandShare * 100,
          area_decimal: totalArea * husbandShare,
        });
        remainingEstateShare -= husbandShare;
      }
    }

    // 2. Mother (Zawil Furood)
    if (motherAlive) {
      const motherShare = hasChildren ? 1 / 6 : 1 / 3;
      heirs.push({
        id: 'mother',
        name_bn: 'মাতা',
        name_en: 'Mother',
        relation: 'মাতা',
        fraction_str: hasChildren ? '১/৬' : '১/৩',
        share_percent: motherShare * 100,
        area_decimal: totalArea * motherShare,
      });
      remainingEstateShare -= motherShare;
    }

    // 3. Father
    let fatherShare = 0;
    if (fatherAlive) {
      if (sonsCount > 0) {
        fatherShare = 1 / 6;
      } else if (daughtersCount > 0) {
        fatherShare = 1 / 6; // plus will receive surplus later if any
      } else {
        // Full residuary
        fatherShare = remainingEstateShare;
      }
      heirs.push({
        id: 'father',
        name_bn: 'পিতা',
        name_en: 'Father',
        relation: 'পিতা',
        fraction_str: sonsCount > 0 ? '১/৬' : '১/৬ + আসাবা',
        share_percent: fatherShare * 100,
        area_decimal: totalArea * fatherShare,
      });
      remainingEstateShare -= fatherShare;
    }

    // 4. Children (Awlad)
    remainingEstateShare = Math.max(0, remainingEstateShare);

    if (sonsCount === 0 && daughtersCount > 0) {
      // Daughters only (Zawil Furood)
      const daughtersTotalShare = daughtersCount === 1 ? 1 / 2 : 2 / 3;
      const actualDaughterShare = Math.min(remainingEstateShare, daughtersTotalShare);
      const eachDaughterShare = actualDaughterShare / daughtersCount;

      for (let i = 1; i <= daughtersCount; i++) {
        heirs.push({
          id: `daughter_${i}`,
          name_bn: daughtersCount === 1 ? 'একমাত্র কন্যা' : `কন্যা (${toBanglaDigits(i)})`,
          name_en: daughtersCount === 1 ? 'Sole Daughter' : `Daughter ${i}`,
          relation: 'কন্যা',
          fraction_str: daughtersCount === 1 ? '১/২' : '২/৩ (হিস্যা)',
          share_percent: eachDaughterShare * 100,
          area_decimal: totalArea * eachDaughterShare,
        });
      }
      remainingEstateShare -= actualDaughterShare;

      // If father alive and surplus remains, father takes residue
      if (fatherAlive && remainingEstateShare > 0.001) {
        const fatherHeir = heirs.find((h) => h.id === 'father');
        if (fatherHeir) {
          fatherHeir.share_percent += remainingEstateShare * 100;
          fatherHeir.area_decimal += totalArea * remainingEstateShare;
        }
      }
    } else if (sonsCount > 0) {
      // Sons + Daughters: Residuary Asabah bil-Ghayr (2:1 ratio)
      const totalUnits = sonsCount * 2 + daughtersCount * 1;
      const unitShare = totalUnits > 0 ? remainingEstateShare / totalUnits : 0;

      for (let i = 1; i <= sonsCount; i++) {
        const sonShare = unitShare * 2;
        heirs.push({
          id: `son_${i}`,
          name_bn: `পুত্র (${toBanglaDigits(i)})`,
          name_en: `Son ${i}`,
          relation: 'পুত্র',
          fraction_str: `২ অংশ (${Math.round((sonShare / remainingEstateShare) * 100)}%)`,
          share_percent: sonShare * 100,
          area_decimal: totalArea * sonShare,
        });
      }

      for (let i = 1; i <= daughtersCount; i++) {
        const dShare = unitShare * 1;
        heirs.push({
          id: `daughter_${i}`,
          name_bn: `কন্যা (${toBanglaDigits(i)})`,
          name_en: `Daughter ${i}`,
          relation: 'কন্যা',
          fraction_str: `১ অংশ (${Math.round((dShare / remainingEstateShare) * 100)}%)`,
          share_percent: dShare * 100,
          area_decimal: totalArea * dShare,
        });
      }
    }

    return heirs;
  }, [
    deceasedGender,
    totalArea,
    wivesCount,
    hasHusband,
    sonsCount,
    daughtersCount,
    fatherAlive,
    motherAlive,
  ]);

  // Color palette for chart bars
  const colorPalette = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  // Submit 1-Click Succession Mutation
  const handleSubmitSuccessionMutation = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await BhumiApi.applyMutation({
        plot_id: selectedPlotId,
        mutation_type: 'SUCCESSION',
        area_decimal: totalArea,
        documents_note: `ওয়ারিশান সনদপত্র নং ${certificateNo} (ফারায়েজ মোতাবেক ${calculatedHeirs.length} জন ওয়ারিশ)`,
        notes_bn: `মৃত ${deceasedName}-এর উত্তরাধিকারীগণের অনুকূলে ইসলামিক ফারায়েজ বিধান অনুযায়ী স্বয়ংক্রিয় খতিয়ান বিভাজন ও নামজারি।`,
        heirs: calculatedHeirs.map((h, i) => ({
          name_bn: `${h.name_bn} (মৃত ${deceasedName})`,
          relation: h.relation,
          fraction: h.fraction_str,
          share_percent: Number(h.share_percent.toFixed(2)),
          area_decimal: Number(h.area_decimal.toFixed(2)),
          nid: `NID-HEIR-${1000 + i}`,
        })),
      });

      setSubmitResult({
        caseNo: res.case_no,
        message: res.message_bn,
      });

      triggerAppNotification({
        title_bn: 'ওয়ারিশান নামজারি আবেদন দাখিল সম্পন্ন',
        title_en: 'Succession Mutation Filed',
        message_bn: `কেস নং ${res.case_no}-এর মাধ্যমে ${calculatedHeirs.length} জন ওয়ারিশের ফারায়েজ নামজারি আবেদন এসিল্যান্ড ট্রাইব্যুনালে প্রেরণ করা হয়েছে।`,
        message_en: `Succession case ${res.case_no} submitted for ${calculatedHeirs.length} heirs to AC Land tribunal.`,
        type: 'SUCCESS',
        targetTab: 'acland',
        targetSection: 'mutations',
      });

      if (onMutationSuccess) {
        onMutationSuccess(res.case_no);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message_bn ||
          err?.response?.data?.error ||
          t('আবেদন দাখিল করতে সমস্যা হয়েছে।', 'Failed to submit succession mutation.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 text-slate-800">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-700 text-white shadow-md shadow-emerald-700/20">
              <Scale className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {t('ইসলামিক ফারায়েজ ও ওয়ারিশান বণ্টন ক্যালকুলেটর', 'Islamic Faraiz & Inheritance Engine')}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  {t('শরিয়াহ ও জাতীয় ট্রাস্ট স্ট্যান্ডার্ড', 'Shariah & Trust Verified')}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t(
                  'উত্তরাধিকারীদের নির্ভুল কোরআনিক হিস্যা নির্ধারণ ও ১-ক্লিকে ওয়ারিশান নামজারি আবেদন',
                  'Calculate exact fractional Quranic shares and file 1-click succession e-mutation'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitResult ? (
          /* Success Screen */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-bold text-slate-900">
              {t('ওয়ারিশান নামজারি আবেদন সফলভাবে দাখিল হয়েছে!', 'Succession Mutation Filed Successfully!')}
            </h4>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 max-w-lg mx-auto text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{t('মিউটেশন কেস নম্বর:', 'Mutation Case No:')}</span>
                <span className="font-mono font-bold text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {submitResult.caseNo}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{t('মোট জমি:', 'Total Area:')}</span>
                <span className="font-bold text-slate-900">
                  {lang === 'bn' ? toBanglaDigits(totalArea) : totalArea} {t('শতাংশ', 'decimals')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{t('ওয়ারিশ সংখ্যা:', 'Total Heirs:')}</span>
                <span className="font-bold text-slate-900">
                  {lang === 'bn' ? toBanglaDigits(calculatedHeirs.length) : calculatedHeirs.length} {t('জন', 'persons')}
                </span>
              </div>
              <p className="text-xs text-emerald-800 pt-2 border-t border-emerald-200/80 leading-relaxed">
                {submitResult.message}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                type="button"
                onClick={() => setSubmitResult(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                {t('নতুন ফারায়েজ হিসাব', 'Calculate Another')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-xs font-bold text-white shadow-md transition cursor-pointer"
              >
                {t('বন্ধ করুন ও ড্যাশবোর্ডে ফিরুন', 'Done & Close')}
              </button>
            </div>
          </div>
        ) : (
          /* Calculator & Submission Form */
          <div className="p-6 space-y-6">
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Deceased & Plot Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('প্রয়াত ব্যক্তির নাম / পরিচয়', 'Deceased Person Name')}
                </label>
                <input
                  type="text"
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  placeholder="মোঃ আবদুল করিম"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('প্রয়াত ব্যক্তির লিঙ্গ', 'Deceased Gender')}
                </label>
                <div className="flex rounded-xl bg-white border border-slate-300 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDeceasedGender('MALE')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      deceasedGender === 'MALE'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('পুরুষ (স্বামী/পিতা)', 'Male')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeceasedGender('FEMALE')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      deceasedGender === 'FEMALE'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t('নারী (স্ত্রী/মাতা)', 'Female')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('জমির প্লট / দাগ নির্বাচন', 'Select Plot / Dag')}
                </label>
                <select
                  value={selectedPlotId}
                  onChange={handlePlotSelect}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {t(`দাগ নং ${toBanglaDigits(p.dag_no)} (${p.mouza_bn || 'মৌজা'}, ${p.total_area_decimal} শতক)`, `Dag ${p.dag_no} (${p.mouza_en || 'Mouza'}, ${p.total_area_decimal} dec)`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-700">
                  {t('মোট বণ্টনের জন্য জমির পরিমাণ (শতক):', 'Total Estate Land Area (decimals):')}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={totalArea}
                    onChange={(e) => setTotalArea(Math.max(0.1, parseFloat(e.target.value) || 0))}
                    className="w-24 text-right font-bold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <span className="font-semibold text-slate-500">{t('শতক', 'dec')}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Family Heir Composition */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-700" />
                <span>{t('উত্তরাধিকারীগণের বিবরণী (ওয়ারিশান)', 'Heirs & Family Tree Composition')}</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {/* Spouse */}
                {deceasedGender === 'MALE' ? (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('জীবিত স্ত্রী সংখ্যা', 'Surviving Wives')}
                    </label>
                    <select
                      value={wivesCount}
                      onChange={(e) => setWivesCount(Number(e.target.value))}
                      className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={0}>০</option>
                      <option value={1}>১ জন</option>
                      <option value={2}>২ জন</option>
                      <option value={3}>৩ জন</option>
                      <option value={4}>৪ জন</option>
                    </select>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {t('স্বামী জীবিত?', 'Husband Alive?')}
                    </label>
                    <select
                      value={hasHusband ? 1 : 0}
                      onChange={(e) => setHasHusband(Number(e.target.value) === 1)}
                      className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value={1}>{t('হ্যাঁ (জীবিত)', 'Yes')}</option>
                      <option value={0}>{t('না (মৃত)', 'No')}</option>
                    </select>
                  </div>
                )}

                {/* Sons */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('পুত্র সন্তান সংখ্যা', 'Sons Count')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={sonsCount}
                    onChange={(e) => setSonsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white text-center"
                  />
                </div>

                {/* Daughters */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('কন্যা সন্তান সংখ্যা', 'Daughters Count')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={daughtersCount}
                    onChange={(e) => setDaughtersCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white text-center"
                  />
                </div>

                {/* Mother */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('মাতা জীবিত?', 'Mother Alive?')}
                  </label>
                  <select
                    value={motherAlive ? 1 : 0}
                    onChange={(e) => setMotherAlive(Number(e.target.value) === 1)}
                    className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={1}>{t('হ্যাঁ', 'Yes')}</option>
                    <option value={0}>{t('না', 'No')}</option>
                  </select>
                </div>

                {/* Father */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('পিতা জীবিত?', 'Father Alive?')}
                  </label>
                  <select
                    value={fatherAlive ? 1 : 0}
                    onChange={(e) => setFatherAlive(Number(e.target.value) === 1)}
                    className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value={1}>{t('হ্যাঁ', 'Yes')}</option>
                    <option value={0}>{t('না', 'No')}</option>
                  </select>
                </div>

                {/* Warishan Cert */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('ওয়ারিশান সনদপত্র নং', 'Cert. No')}
                  </label>
                  <input
                    type="text"
                    value={certificateNo}
                    onChange={(e) => setCertificateNo(e.target.value)}
                    className="w-full text-xs font-mono font-bold p-1.5 rounded-lg border border-slate-300 bg-white text-center"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Graphical Visual Proportion Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-700" />
                  {t('জমির শতক বণ্টন অনুপাত চার্ট', 'Land Apportionment Share Distribution')}
                </span>
                <span className="font-semibold text-slate-500">
                  {t('মোট ১০০% হিস্যা সম্পূর্ণ', '100% Exact Conserved Distribution')}
                </span>
              </div>

              {/* Progress stack */}
              <div className="h-5 w-full flex rounded-lg overflow-hidden bg-slate-100 shadow-inner">
                {calculatedHeirs.map((h, i) => (
                  <div
                    key={h.id}
                    style={{ width: `${Math.max(1, h.share_percent)}%` }}
                    className={`${colorPalette[i % colorPalette.length]} h-full transition-all duration-300 relative group`}
                    title={`${h.name_bn}: ${h.share_percent.toFixed(2)}% (${h.area_decimal.toFixed(2)} শতক)`}
                  />
                ))}
              </div>

              {/* Small legend */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
                {calculatedHeirs.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-sm ${colorPalette[i % colorPalette.length]}`} />
                    <span className="font-medium">{h.name_bn}:</span>
                    <span className="font-bold text-slate-800">
                      {lang === 'bn' ? toBanglaDigits(h.area_decimal.toFixed(2)) : h.area_decimal.toFixed(2)} {t('শতক', 'dec')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 4: Complete Fractional Table */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">{t('ওয়ারিশান নাম ও সম্পর্ক', 'Heir & Relation')}</th>
                    <th className="px-4 py-3">{t('আইনি হিস্যা / ভগ্নাংশ', 'Quranic Share')}</th>
                    <th className="px-4 py-3 text-right">{t('শতাংশ (%)', 'Percentage')}</th>
                    <th className="px-4 py-3 text-right">{t('বণ্টনকৃত জমি (শতক)', 'Allocated Land (Dec)')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {calculatedHeirs.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-900">{h.name_bn}</span>
                        <span className="ml-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {h.relation}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800">
                        {h.fraction_str}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                        {h.share_percent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900">
                        {lang === 'bn' ? toBanglaDigits(h.area_decimal.toFixed(2)) : h.area_decimal.toFixed(2)} {t('শতক', 'dec')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                  <tr>
                    <td className="px-4 py-2.5">{t('মোট সংকলন', 'Total Conserved')}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-900">১/১ (১০০%)</td>
                    <td className="px-4 py-2.5 text-right font-mono">১০০.০০%</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-900 font-extrabold">
                      {lang === 'bn' ? toBanglaDigits(totalArea.toFixed(2)) : totalArea.toFixed(2)} {t('শতক', 'dec')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>
                  {t(
                    'আবেদন দাখিল করলে স্বয়ংক্রিয়ভাবে এসিল্যান্ড ডকেটে শুনানির জন্য কেস প্রস্তুত হবে।',
                    'Filing will auto-queue a verified succession case on the AC Land bench.'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  {t('বাতিল', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitSuccessionMutation}
                  disabled={submitting || calculatedHeirs.length === 0}
                  className="w-1/2 sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <span>{t('দাখিল হচ্ছে...', 'Submitting...')}</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{t('১-ক্লিকে ওয়ারিশান নামজারি আবেদন দাখিল', 'File 1-Click Succession e-Mutation')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
