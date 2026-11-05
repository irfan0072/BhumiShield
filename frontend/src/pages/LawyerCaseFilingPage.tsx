import React, { useState, useEffect } from 'react';
import {
  Scale,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building,
  UserCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Printer,
  Download,
  Copy,
  Check,
  RefreshCw,
  Search,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Calendar,
  Lock,
  ChevronRight,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { BhumiApi, LawyerVerificationResult, LawyerCaseDocketResponse } from '../api/client';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { toBanglaDigits, maskPhone, maskNid } from '../theme/tokens';
import { useAppUI } from '../i18n';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LawyerChamberDashboard } from '@/components/officials/LawyerChamberDashboard';

export interface LawyerCaseFilingPageProps {
  currentSubPage?: string;
  onNavigateSubPage?: (page: string) => void;
  onNavigateHome?: () => void;
}

export const LawyerCaseFilingPage: React.FC<LawyerCaseFilingPageProps> = ({
  currentSubPage,
  onNavigateSubPage,
  onNavigateHome,
}) => {
  const { t, lang, activeSubTab, setActiveSubTab } = useAppUI();

  const isOverview = (currentSubPage === 'overview' || activeSubTab === 'overview' || (!currentSubPage && !activeSubTab));

  // Streamlined 3-Step Wizard:
  // Step 1: Advocate Bar Council Verification
  // Step 2: Disputed Plot & Court Suit Particulars
  // Step 3: Injunction Grounds, Affidavit & Digital Docket
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(() => {
    if (currentSubPage === 'step2' || activeSubTab === 'step2') return 2;
    if (currentSubPage === 'step3' || activeSubTab === 'step3') return 3;
    return 1;
  });

  useEffect(() => {
    const target = currentSubPage || activeSubTab;
    if (target === 'step1') setCurrentStep(1);
    else if (target === 'step2') setCurrentStep(2);
    else if (target === 'step3') setCurrentStep(3);
  }, [currentSubPage, activeSubTab]);

  const handleStepSelect = (s: 1 | 2 | 3) => {
    setCurrentStep(s);
    const sub = s === 1 ? 'step1' : s === 2 ? 'step2' : 'step3';
    setActiveSubTab(sub);
    if (onNavigateSubPage) {
      onNavigateSubPage(sub);
    }
  };

  // --- Step 1: Land Jurisdiction & Plot ---
  const [address, setAddress] = useState<AddressSelection>({
    division_bn: 'ঢাকা',
    division_en: 'Dhaka',
    district_bn: 'ঢাকা',
    district_en: 'Dhaka',
    upazila_bn: 'সাভার',
    upazila_en: 'Savar',
    mouza_id: 1,
    mouza_bn: 'বিরুলিয়া',
    mouza_en: 'Birulia',
    jl_no: '০৫',
  });

  const [availablePlots, setAvailablePlots] = useState<any[]>([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<number>(1);
  const [selectedPlot, setSelectedPlot] = useState<any | null>(null);

  // --- Step 2: Advocate Verification ---
  const [barCouncilNo, setBarCouncilNo] = useState<string>('BC-DH-14285');
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [verifiedLawyer, setVerifiedLawyer] = useState<LawyerVerificationResult['lawyer'] | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // --- Step 3: Suit & Plaint Details ---
  const [courtName, setCourtName] = useState<string>('বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার, ঢাকা');
  const [suitNo, setSuitNo] = useState<string>('দেওয়ানি মোকদ্দমা নং ৪৫/২০২৬');
  const [disputeType, setDisputeType] = useState<string>('INJUNCTION');
  const [caseStage, setCaseStage] = useState<string>('STATUS_QUO_ISSUED');
  const [plaintiffName, setPlaintiffName] = useState<string>('মো. রফিকুল ইসলাম');
  const [plaintiffNid, setPlaintiffNid] = useState<string>('19852694123456789');
  const [defendantName, setDefendantName] = useState<string>('আব্দুল মজিদ ও অন্যান্য');
  const [disputedArea, setDisputedArea] = useState<string>('12.5');
  const [boundaryNorth, setBoundaryNorth] = useState<string>('সরকারি কাঁচা রাস্তা');
  const [boundarySouth, setBoundarySouth] = useState<string>('রহিম মোল্লার জমি');
  const [boundaryEast, setBoundaryEast] = useState<string>('দাগ নং ১০২');
  const [boundaryWest, setBoundaryWest] = useState<string>('খাস খাল');
  const [descriptionBn, setDescriptionBn] = useState<string>(
    'নালিশি জমিতে জোরপূর্বক জবরদখল ও সীমানা প্রাচীর নির্মাণের অপচেষ্টার প্রেক্ষিতে স্বত্ব ঘোষণা ও অন্তর্বর্তীকালীন নিষেধাজ্ঞা আবেদন।'
  );
  const [affidavitAgreed, setAffidavitAgreed] = useState<boolean>(false);

  // --- Submission & Docket Modal ---
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [docketResponse, setDocketResponse] = useState<LawyerCaseDocketResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Fetch plots when mouza changes
  useEffect(() => {
    let isMounted = true;
    setPlotsLoading(true);
    BhumiApi.getPlots(address.mouza_id ? Number(address.mouza_id) : undefined)
      .then((plots) => {
        if (!isMounted) return;
        setAvailablePlots(plots || []);
        if (plots && plots.length > 0) {
          const match = plots.find((p: any) => p.id === selectedPlotId) || plots[0];
          setSelectedPlotId(match.id);
          setSelectedPlot(match);
        } else {
          setSelectedPlot(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load plots', err);
      })
      .finally(() => {
        if (isMounted) setPlotsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [address.mouza_id]);

  // When plot selection changes
  const handlePlotSelect = (plotId: number) => {
    setSelectedPlotId(plotId);
    const p = availablePlots.find((item) => item.id === plotId);
    setSelectedPlot(p || null);
    if (p && p.total_area_decimal) {
      setDisputedArea(String(p.total_area_decimal));
    }
  };

  // Verify Advocate
  const handleVerifyLawyer = async (targetNo?: string) => {
    const no = (targetNo || barCouncilNo).trim().toUpperCase();
    if (!no) {
      setVerifyError(t('বার কাউন্সিল লাইসেন্স নম্বর লিখুন।', 'Please enter Bar Council license number.'));
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifiedLawyer(null);

    try {
      const res = await BhumiApi.verifyLawyer(no);
      if (res.verified && res.lawyer) {
        setVerifiedLawyer(res.lawyer);
        setBarCouncilNo(res.lawyer.bar_council_no);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message_bn ||
        t('আইনজীবী যাচাই করতে ব্যর্থ হয়েছে। লাইসেন্স নম্বরটি সঠিক কি না নিশ্চিত করুন।', 'Verification failed. Please check the license number.');
      setVerifyError(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Submit Case
  const handleSubmitCase = async () => {
    if (!verifiedLawyer) {
      setSubmitError(t('অনুগ্রহ করে প্রথমে বিজ্ঞ আইনজীবীর লাইসেন্স যাচাই করুন।', 'Please verify advocate license first.'));
      setCurrentStep(2);
      return;
    }
    if (!selectedPlotId) {
      setSubmitError(t('নালিশি দাগ নম্বর নির্বাচন করুন।', 'Please select disputed plot number.'));
      setCurrentStep(1);
      return;
    }
    if (!suitNo.trim()) {
      setSubmitError(t('বিজ্ঞ আদালতের মোকদ্দমা নম্বর প্রদান করুন।', 'Please enter court suit/case number.'));
      setCurrentStep(3);
      return;
    }
    if (!affidavitAgreed) {
      setSubmitError(t('আইনি হলফনামা ও সত্যতা নিশ্চিতকরণ চেকবক্সটি পূরণ করতে হবে।', 'You must agree to the legal affidavit.'));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        bar_council_no: verifiedLawyer.bar_council_no,
        plot_id: selectedPlotId,
        court_name: courtName,
        suit_no: suitNo,
        dispute_type: disputeType,
        case_stage: caseStage,
        plaintiff_name: plaintiffName,
        defendant_name: defendantName,
        plaintiff_nid: plaintiffNid,
        disputed_area_decimal: parseFloat(disputedArea) || 10,
        description_bn: descriptionBn,
        boundary_north: boundaryNorth,
        boundary_south: boundarySouth,
        boundary_east: boundaryEast,
        boundary_west: boundaryWest,
      };

      const res = await BhumiApi.fileLawyerCase(payload);
      setDocketResponse(res);
      setCurrentStep(3);
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.message_bn ||
          t('মোকদ্দমা দাখিল করতে ত্রুটি হয়েছে। অনুগ্রহ করে সকল তথ্য পুনরায় যাচাই করুন।', 'Failed to file case docket.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setDocketResponse(null);
    setCurrentStep(1);
    setSuitNo('');
    setDescriptionBn('');
    setAffidavitAgreed(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Printable Docket View - Hidden on screen, visible during window.print() */}
      {docketResponse && (
        <div className="hidden print:block p-8 bg-white text-black font-serif leading-relaxed max-w-4xl mx-auto border-4 border-double border-slate-900 my-4">
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-4">
            <div className="text-sm font-bold tracking-widest uppercase">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার / বাংলাদেশ বার কাউন্সিল</div>
            <div className="text-2xl font-black mt-1">ভূমি বিরোধ ও বিচারাধীন মোকদ্দমা নোটিশ ও ডিজিটাল ডকেট</div>
            <div className="text-xs font-mono text-slate-700 mt-1">
              ডকেট ট্র্যাকিং আইডি: <span className="font-bold underline">{docketResponse.case_no}</span> | দাখিলের তারিখ:{' '}
              {new Date(docketResponse.verification.filed_at).toLocaleString('bn-BD')}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3 bg-slate-50 border border-slate-300">
            <div>
              <div className="font-bold text-slate-700 flex items-center gap-1.5">
                <span>বিজ্ঞ আইনজীবী (দাখিলকারী):</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-[#006A4E] border border-emerald-300">
                  ✓ বার কাউন্সিল সনদপ্রাপ্ত
                </span>
              </div>
              <div className="text-sm font-bold mt-0.5">{docketResponse.lawyer.name_bn}</div>
              <div>বার কাউন্সিল সনদ নং: <span className="font-mono font-bold">{docketResponse.lawyer.bar_council_no}</span></div>
              <div>সদস্য: {docketResponse.lawyer.district_bar}</div>
              <div>মোবাইল: {maskPhone(docketResponse.lawyer.phone, lang)}</div>
            </div>
            <div>
              <div className="font-bold text-slate-700">আদালত ও মোকদ্দমার বিবরণ:</div>
              <div className="text-sm font-bold mt-0.5">{docketResponse.court_details.court_name}</div>
              <div>মোকদ্দমা নম্বর: <span className="font-bold text-slate-900">{docketResponse.court_details.suit_no}</span></div>
              <div>মোকদ্দমার পর্যায়: {docketResponse.court_details.case_stage}</div>
              <div>
                বাদী: <span className="font-bold">{docketResponse.court_details.plaintiff_name}</span> (এনআইডি: <span className="font-mono">{maskNid((docketResponse.court_details as any)?.plaintiff_nid || plaintiffNid, lang)}</span>) বনাম বিবাদী: <span className="font-bold">{docketResponse.court_details.defendant_name}</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-900 p-3 mb-4 text-xs">
            <div className="font-bold text-sm border-b border-slate-300 pb-1 mb-2">নালিশি ভূমির তফসিল ও চৌহদ্দি:</div>
            <div className="grid grid-cols-3 gap-2">
              <div>বিভাগ: {docketResponse.plot.district_bn}</div>
              <div>জেলা: {docketResponse.plot.district_bn}</div>
              <div>উপজেলা: {docketResponse.plot.upazila_bn}</div>
              <div>মৌজা: {docketResponse.plot.mouza_bn}</div>
              <div>দাগ নম্বর: <span className="font-bold text-sm">দাগ নং {docketResponse.plot.dag_no_bn || docketResponse.plot.dag_no}</span></div>
              <div>নালিশি অংশ: <span className="font-bold">{docketResponse.court_details.disputed_area_decimal} শতক</span></div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <span className="font-bold">চৌহদ্দি: </span>
              উত্তর: {docketResponse.court_details.boundaries.north || 'অনির্দিষ্ট'},{' '}
              দক্ষিণ: {docketResponse.court_details.boundaries.south || 'অনির্দিষ্ট'},{' '}
              পূর্ব: {docketResponse.court_details.boundaries.east || 'অনির্দিষ্ট'},{' '}
              পশ্চিম: {docketResponse.court_details.boundaries.west || 'অনির্দিষ্ট'}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-300 text-[11px] mb-4">
            <span className="font-bold text-amber-900">আইনি সতর্কতা ও সিস্টেমে লিটিগেশন লক:</span> এই ভূমির বিরুদ্ধে বিজ্ঞ আদালতে
            মামলা বিচারাধীন থাকায় ভূমি সুরক্ষা (BhumiShield) প্ল্যাটফর্মের সাব-রেজিস্ট্রার দলিল নিবন্ধন এবং সহকারী কমিশনার (ভূমি) এর
            ই-নামজারি ওয়ার্কস্পেসে স্বয়ংক্রিয়ভাবে লিটিগেশন লাল সতর্কতা সক্রিয় হয়েছে।
          </div>

          <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-end text-[10px]">
            <div>
              <details className="text-[9px] bg-slate-100 border border-slate-300 rounded p-1.5 max-w-sm">
                <summary className="font-bold text-slate-800 cursor-pointer select-none">
                  ডিজিটাল প্রমাণীকরণ হ্যাশ (SHA-256) ▾
                </summary>
                <div className="font-mono text-[8px] break-all pt-1 mt-1 border-t border-slate-200">
                  {docketResponse.verification.content_hash}
                </div>
              </details>
              <div className="mt-1 text-[9px] text-slate-500">সিস্টেম অডিট ট্রেইল: Appended to Ledger via Advocate Portal</div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 border border-slate-400 mx-auto flex items-center justify-center font-mono text-[9px] bg-slate-100">
                [QR VALIDATION]
              </div>
              <div className="mt-1 font-bold">অনলাইন কিউআর ভেরিফিকেশন</div>
            </div>
            <div className="text-right">
              <div className="h-10"></div>
              <div className="border-t border-slate-800 pt-1 font-bold">দাখিলকারী বিজ্ঞ আইনজীবীর স্বাক্ষর ও সিল</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen View */}
      <div className="print:hidden space-y-4">
        {isOverview ? (
          <LawyerChamberDashboard
            onNavigateTab={(tab) => {
              if (tab === 'step1') {
                handleStepSelect(1);
              } else if (tab === 'step2') {
                handleStepSelect(2);
              } else if (tab === 'step3') {
                handleStepSelect(3);
              } else {
                setActiveSubTab(tab);
                if (onNavigateSubPage) onNavigateSubPage(tab);
              }
            }}
            barCouncilNo={barCouncilNo}
          />
        ) : (
          <>
            {/* Top Slim Ribbon */}
            <div className="bg-slate-900 text-white border-b border-indigo-900/40 -mx-3 sm:-mx-4 -mt-3.5 sm:-mt-4">
              <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center shrink-0">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xs sm:text-sm font-black tracking-tight text-white">
                        {t('আইনজীবী মোকদ্দমা ও আরজি সেল', 'Lawyer Court Filing Desk')}
                      </h1>
                      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {t('আইনজীবী পোর্টাল', 'Lawyer Portal')}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {t('নালিশি জমি নির্বাচন, সনদ যাচাই এবং নিষেধাজ্ঞা আরজি দাখিল।', 'Disputed plot selection, bar verification, and injunction filing.')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveSubTab('overview');
                      if (onNavigateSubPage) onNavigateSubPage('overview');
                    }}
                    className="bg-white/10 hover:bg-white/20 border-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>{t('← চেম্বার ড্যাশবোর্ড', '← Chamber Dashboard')}</span>
                  </Button>
                  {onNavigateHome && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onNavigateHome}
                      className="bg-white/10 hover:bg-white/20 border-white/20 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                      <span>{t('পোর্টালে ফিরুন', 'Back to Portal')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Canonical Stepper Navigation with shadcn Tabs */}
        <div className="max-w-7xl mx-auto">
          <Tabs
            value={String(currentStep)}
            onValueChange={(val) => {
              const s = Number(val) as 1 | 2 | 3;
              setCurrentStep(s);
              setActiveSubTab(`step${s}`);
            }}
            className="w-full"
          >
            <TabsList className="w-full h-auto p-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-100/90 rounded-xl border border-slate-200">
              <TabsTrigger
                value="1"
                className="h-auto justify-start flex items-center gap-2 p-1.5 sm:p-2 rounded-lg text-left transition cursor-pointer data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:font-bold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-indigo-200 text-slate-600 hover:bg-white/50"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    currentStep === 1 ? 'bg-indigo-600 text-white' : verifiedLawyer ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {verifiedLawyer ? '✓' : toBanglaDigits(1, lang)}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">{t('ধাপ ১', 'Step 1')}</div>
                  <div className="text-[11px] font-bold truncate">{t('বার সনদ যাচাই', 'Bar License')}</div>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="2"
                className="h-auto justify-start flex items-center gap-2 p-1.5 sm:p-2 rounded-lg text-left transition cursor-pointer data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:font-bold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-indigo-200 text-slate-600 hover:bg-white/50"
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    currentStep === 2 ? 'bg-indigo-600 text-white' : selectedPlot ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {selectedPlot ? '✓' : toBanglaDigits(2, lang)}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">{t('ধাপ ২', 'Step 2')}</div>
                  <div className="text-[11px] font-bold truncate">{t('মামলার তথ্য', 'Suit Details')}</div>
                </div>
              </TabsTrigger>

              <TabsTrigger
                value="3"
                className={`h-auto justify-start flex items-center gap-2 p-1.5 sm:p-2 rounded-lg text-left transition cursor-pointer data-[state=active]:bg-white data-[state=active]:text-indigo-900 data-[state=active]:font-bold data-[state=active]:shadow-xs data-[state=active]:border data-[state=active]:border-indigo-200 text-slate-600 hover:bg-white/50 ${
                  docketResponse ? 'bg-emerald-50 text-emerald-800' : ''
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                    currentStep === 3 ? 'bg-indigo-600 text-white' : docketResponse ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {docketResponse ? '✓' : toBanglaDigits(3, lang)}
                </div>
                <div className="min-w-0">
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">{t('ধাপ ৩', 'Step 3')}</div>
                  <div className="text-[11px] font-bold truncate">{t('নিষেধাজ্ঞা আরজি', 'Injunction Petition')}</div>
                </div>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Global Error Banner */}
        {submitError && (
          <div className="max-w-7xl mx-auto">
            <Alert variant="destructive" className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <AlertDescription className="text-xs font-bold">{submitError}</AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSubmitError(null)}
                className="h-6 px-2 text-rose-700 hover:text-rose-900"
              >
                ✕
              </Button>
            </Alert>
          </div>
        )}

        {/* Cockpit Layout: Steps 1 to 3 in Dual Pane */}
        {!(currentStep === 3 && docketResponse) ? (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
            {/* Left 7 Columns: Form Workspace */}
            <div className="lg:col-span-7 space-y-3">
              {/* STEP 1: Lawyer Bar Council Verification */}
              {currentStep === 1 && (
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
                  <div className="border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                      <Scale className="w-4 h-4" />
                      <span>{t('ধাপ ১: বিজ্ঞ আইনজীবীর বার কাউন্সিল সনদ যাচাই', 'Step 1: Advocate Bar Council License Verification')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t(
                        'জাল বা অননুমোদিত মামলা রোধকল্পে সিস্টেমে সংরক্ষিত বার কাউন্সিল রেজিস্ট্রি থেকে আইনজীবী সনদ রিয়েল-টাইমে ভেরিফাই করা হয়।',
                        'Lawyer certificates are verified against Bangladesh Bar Council registry to prevent fraudulent suits.'
                      )}
                    </p>
                  </div>

                  {/* Verification Search Box */}
                  <div>
                    <Label htmlFor="lawyer-bar-council-no" className="block text-xs font-bold text-slate-800 mb-1">
                      {t('বার কাউন্সিল সনদ / এনরোলমেন্ট নম্বর লিখুন *', 'Enter Bar Council License / Enrollment No *')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Scale className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                        <Input
                          id="lawyer-bar-council-no"
                          type="text"
                          value={barCouncilNo}
                          onChange={(e) => {
                            setBarCouncilNo(e.target.value.toUpperCase());
                            setVerifyError(null);
                          }}
                          placeholder={t('যেমন: BC-DH-14285', 'e.g. BC-DH-14285')}
                          className="pl-9 h-10 text-xs font-mono font-bold uppercase"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleVerifyLawyer()}
                        disabled={verifyLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white h-10 px-4 text-xs font-bold gap-1.5 shrink-0 shadow-xs"
                      >
                        {verifyLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>{t('যাচাই করুন', 'Verify')}</span>
                      </Button>
                    </div>

                    {/* Quick Demo Credentials Helpers */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-semibold">ডেমো সনদ ক্লিক করুন:</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBarCouncilNo('BC-DH-14285');
                          handleVerifyLawyer('BC-DH-14285');
                        }}
                        className="h-6 px-2 text-[10px] font-mono font-bold text-slate-700 rounded-md"
                      >
                        BC-DH-14285 (ঢাকা)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBarCouncilNo('BC-CM-09821');
                          handleVerifyLawyer('BC-CM-09821');
                        }}
                        className="h-6 px-2 text-[10px] font-mono font-bold text-slate-700 rounded-md"
                      >
                        BC-CM-09821 (কুমিল্লা)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBarCouncilNo('BC-CTG-22104');
                          handleVerifyLawyer('BC-CTG-22104');
                        }}
                        className="h-6 px-2 text-[10px] font-mono font-bold text-slate-700 rounded-md"
                      >
                        BC-CTG-22104 (চট্টগ্রাম)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBarCouncilNo('BC-SUSP-99999');
                          handleVerifyLawyer('BC-SUSP-99999');
                        }}
                        className="h-6 px-2 text-[10px] font-mono font-bold text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100 rounded-md"
                      >
                        BC-SUSP-99999 (স্থগিত টেস্ট)
                      </Button>
                    </div>
                  </div>

                  {/* Verification Result Card */}
                  {verifyError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-rose-800">যাচাইকরণ ব্যর্থ হয়েছে</div>
                        <div className="text-xs text-rose-700 mt-0.5 leading-relaxed">{verifyError}</div>
                      </div>
                    </div>
                  )}

                  {verifiedLawyer && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-300 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                              <span>বার কাউন্সিল অনুমোদিত আইনজীবী</span>
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-200 text-emerald-900 font-extrabold">
                                ✓ বার কাউন্সিল সনদপ্রাপ্ত
                              </span>
                            </div>
                            <div className="text-[10px] text-emerald-700">ডিজিটাল কেস দাখিল করার বৈধ অনুমোদন রয়েছে</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">আইনজীবীর নাম</div>
                          <div className="font-bold text-slate-900 text-xs mt-0.5">{verifiedLawyer.lawyer_name_bn}</div>
                          {verifiedLawyer.lawyer_name_en && (
                            <div className="text-[10px] text-slate-500 font-medium">{verifiedLawyer.lawyer_name_en}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">লাইসেন্স নং ও সমিতি</div>
                          <div className="font-mono font-bold text-indigo-900 text-xs mt-0.5">
                            {verifiedLawyer.bar_council_no}
                          </div>
                          <div className="text-[10px] text-slate-500">{verifiedLawyer.district_bar}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-500 font-semibold uppercase">যোগাযোগ</div>
                          <div className="font-semibold text-slate-800 text-xs mt-0.5">{maskPhone(verifiedLawyer.phone, lang)}</div>
                          <div className="text-[10px] text-slate-500 truncate">{verifiedLawyer.chamber_address_bn || 'কোর্ট চেম্বার'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Button */}
                  <div className="pt-2 border-t border-slate-100 flex justify-end">
                    <Button
                      type="button"
                      disabled={!verifiedLawyer}
                      onClick={() => setCurrentStep(2)}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <span>{t('পরবর্তী: নালিশি জমি ও মোকদ্দমা বিবরণ', 'Next: Disputed Plot & Suit Details')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 2: Disputed Plot & Court Suit Particulars */}
              {currentStep === 2 && (
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                      <MapPin className="w-4 h-4" />
                      <span>{t('ধাপ ২: ভৌগোলিক অধিক্ষেত্র, নালিশি দাগ ও মোকদ্দমার বিবরণ', 'Step 2: Jurisdiction, Disputed Plot & Court Suit Particulars')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t(
                        'বিভাগ, জেলা, উপজেলা এবং মৌজা নির্বাচন করার পর সংশ্লিষ্ট মৌজার সকল সক্রিয় দাগ নম্বরের তালিকা ও মোকদ্দমার তথ্য দিন।',
                        'Select division, district, upazila, and mouza to view active plots and provide court suit details.'
                      )}
                    </p>
                  </div>

                  {/* Cascading Dropdowns */}
                  <div>
                    <AddressCascader
                      selectedDivision={address.division_bn}
                      selectedDistrict={address.district_bn}
                      selectedUpazila={address.upazila_bn}
                      selectedMouzaId={address.mouza_id}
                      showMouza={true}
                      required={true}
                      onChange={(sel) => setAddress(sel)}
                    />
                  </div>

                  {/* Plot Cards Grid */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>মৌজার দাগ নম্বর নির্বাচন করুন *</span>
                        {plotsLoading && <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />}
                      </label>
                      <span className="text-[11px] text-slate-500">
                        উপলব্ধ: <span className="font-bold text-slate-800">{toBanglaDigits(availablePlots.length)}</span> টি
                      </span>
                    </div>

                    {availablePlots.length === 0 && !plotsLoading ? (
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                        এই মৌজায় কোনো সক্রিয় দাগ নম্বর পাওয়া যায়নি। অনুগ্রহ করে অন্য মৌজা নির্বাচন করুন।
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                        {availablePlots.map((plot) => {
                          const isSelected = plot.id === selectedPlotId;
                          return (
                            <Button
                              key={plot.id}
                              type="button"
                              variant="outline"
                              onClick={() => handlePlotSelect(plot.id)}
                              className={`h-auto p-2.5 rounded-lg border text-left justify-start flex-col items-start transition cursor-pointer relative ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs hover:bg-indigo-50'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              }`}
                            >
                              {isSelected && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600"></span>
                              )}
                              <div className="text-[9px] font-semibold text-slate-400">দাগ নং</div>
                              <div className="text-sm font-black text-slate-900 mt-0.5">
                                {plot.dag_no_bn || plot.dag_no}
                              </div>
                              <div className="text-[10px] font-medium text-slate-500 mt-0.5 truncate">
                                {plot.land_type_bn || plot.land_type || 'ভিটা'}
                              </div>
                              <div className="text-[10px] font-bold text-indigo-700 mt-0.5">
                                {toBanglaDigits(plot.total_area_decimal)} শতক
                              </div>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Plot Summary Card */}
                  {selectedPlot && (
                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedPlot.dag_no_bn || selectedPlot.dag_no}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>নির্বাচিত দাগ: {selectedPlot.dag_no_bn || selectedPlot.dag_no}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-100 text-indigo-800 font-semibold">
                              {selectedPlot.land_type_bn || 'আবাসিক জমি'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 mt-0.5">
                            মৌজা: {address.mouza_bn} (জে.এল. নং {address.jl_no || '০৫'}) | উপজেলা: {address.upazila_bn}
                          </div>
                        </div>
                      </div>
                      <div className="text-right sm:self-auto self-end">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold">মোট পরিমাণ</div>
                        <div className="text-xs font-black text-indigo-900">
                          {toBanglaDigits(selectedPlot.total_area_decimal)} শতক
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Court Suit Particulars Sub-Form */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{t('বিজ্ঞ আদালতের মোকদ্দমার মূল বিবরণ', 'Court Suit Core Particulars')}</span>
                    </div>

                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Court Name */}
                    <div>
                      <Label htmlFor="filing-court-name" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('বিজ্ঞ আদালতের পূর্ণ নাম *', 'Full Court Name *')}
                      </Label>
                      <Input
                        id="filing-court-name"
                        type="text"
                        required
                        value={courtName}
                        onChange={(e) => setCourtName(e.target.value)}
                        placeholder={t('বিজ্ঞ সিনিয়র সহকারী জজ আদালত, সাভার', 'Senior Assistant Judge Court, Savar')}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Suit No */}
                    <div>
                      <Label htmlFor="filing-suit-no" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('মোকদ্দমা নম্বর ও সন *', 'Suit Number & Year *')}
                      </Label>
                      <Input
                        id="filing-suit-no"
                        type="text"
                        required
                        value={suitNo}
                        onChange={(e) => setSuitNo(e.target.value)}
                        placeholder={t('যেমন: দেওয়ানি মোকদ্দমা নং ৪৫/২০২৬', 'e.g., Civil Suit No. 45/2026')}
                        className="h-9 text-xs font-bold"
                      />
                    </div>

                    {/* Dispute / Suit Type */}
                    <div>
                      <Label htmlFor="filing-dispute-type" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('মোকদ্দমার প্রকারভেদ *', 'Suit Type *')}
                      </Label>
                      <Select value={disputeType} onValueChange={setDisputeType}>
                        <SelectTrigger id="filing-dispute-type" className="w-full h-9 text-xs font-semibold">
                          <SelectValue placeholder={t('মোকদ্দমার প্রকারভেদ নির্বাচন করুন', 'Select Suit Type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INJUNCTION" className="text-xs">{t('অন্তর্বর্তীকালীন নিষেধাজ্ঞা আবেদন (Temporary Injunction)', 'Temporary Injunction Application')}</SelectItem>
                          <SelectItem value="TITLE_DECLARATION" className="text-xs">{t('স্বত্ব ঘোষণা ও চিরতরে নিষেধাজ্ঞা (Declaration of Title)', 'Declaration of Title & Permanent Injunction')}</SelectItem>
                          <SelectItem value="PARTITION_SUIT" className="text-xs">{t('বণ্টন / বাটোয়ারা মোকদ্দমা (Partition Suit)', 'Partition Suit')}</SelectItem>
                          <SelectItem value="SPECIFIC_PERFORMANCE" className="text-xs">{t('চুক্তি বলবৎকরণ মোকদ্দমা (Specific Performance)', 'Specific Performance Suit')}</SelectItem>
                          <SelectItem value="POSSESSION_RECOVERY" className="text-xs">{t('বেদখল পুনরুদ্ধার মামলা (Recovery of Possession)', 'Recovery of Possession Suit')}</SelectItem>
                          <SelectItem value="RECORD_CORRECTION" className="text-xs">{t('রেকর্ড সংশোধনের মামলা (Record Correction)', 'Record Correction Suit')}</SelectItem>
                          <SelectItem value="EVICTION" className="text-xs">{t('উচ্ছেদ মোকদ্দমা (Eviction Suit)', 'Eviction Suit')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Case Stage */}
                    <div>
                      <Label htmlFor="filing-case-stage" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('বর্তমান পর্যায় *', 'Current Stage *')}
                      </Label>
                      <Select value={caseStage} onValueChange={setCaseStage}>
                        <SelectTrigger id="filing-case-stage" className="w-full h-9 text-xs font-semibold">
                          <SelectValue placeholder={t('বর্তমান পর্যায় নির্বাচন করুন', 'Select Current Stage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="STATUS_QUO_ISSUED" className="text-xs">{t('স্থিতাবস্থা জারি (Status Quo Order Issued)', 'Status Quo Order Issued')}</SelectItem>
                          <SelectItem value="INJUNCTION_GRANTED" className="text-xs">{t('অস্থায়ী নিষেধাজ্ঞা মঞ্জুর (Injunction Granted)', 'Injunction Granted')}</SelectItem>
                          <SelectItem value="PLAINT_ADMITTED" className="text-xs">{t('আরজি গৃহীত ও সমন জারি (Plaint Admitted)', 'Plaint Admitted & Summons Issued')}</SelectItem>
                          <SelectItem value="WRITTEN_STATEMENT" className="text-xs">{t('লিখিত জবাব দাখিল পর্যায়ে (Written Statement)', 'Written Statement Stage')}</SelectItem>
                          <SelectItem value="TRIAL_HEARING" className="text-xs">{t('সাক্ষ্য ও চূড়ান্ত শুনানি চলমান (Trial / Hearing)', 'Trial / Hearing Stage')}</SelectItem>
                          <SelectItem value="APPEAL_PENDING" className="text-xs">{t('আপিল বিচারাধীন (Appeal Pending)', 'Appeal Pending')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Plaintiff */}
                    <div>
                      <Label htmlFor="filing-plaintiff-name" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('বাদী পক্ষের নাম *', 'Plaintiff Name *')}
                      </Label>
                      <Input
                        id="filing-plaintiff-name"
                        type="text"
                        required
                        value={plaintiffName}
                        onChange={(e) => setPlaintiffName(e.target.value)}
                        placeholder={t('মো. রফিকুল ইসলাম', 'Md. Rafiqul Islam')}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Defendant */}
                    <div>
                      <Label htmlFor="filing-defendant-name" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('বিবাদী পক্ষের নাম *', 'Defendant Name *')}
                      </Label>
                      <Input
                        id="filing-defendant-name"
                        type="text"
                        required
                        value={defendantName}
                        onChange={(e) => setDefendantName(e.target.value)}
                        placeholder={t('আব্দুল মজিদ ও অন্যান্য', 'Abdul Majid & Others')}
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Plaintiff NID */}
                    <div>
                      <Label htmlFor="filing-plaintiff-nid" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('বাদী পক্ষের এনআইডি', 'Plaintiff NID')}
                      </Label>
                      <Input
                        id="filing-plaintiff-nid"
                        type="text"
                        value={plaintiffNid}
                        onChange={(e) => setPlaintiffNid(e.target.value)}
                        placeholder="19852694123456789"
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    {/* Disputed Area */}
                    <div>
                      <Label htmlFor="filing-disputed-area" className="block text-xs font-bold text-slate-800 mb-1">
                        {t('নালিশি ভূমির পরিমাণ (শতক) *', 'Disputed Land Area (Decimals) *')}
                      </Label>
                      <Input
                        id="filing-disputed-area"
                        type="number"
                        step="0.01"
                        required
                        value={disputedArea}
                        onChange={(e) => setDisputedArea(e.target.value)}
                        placeholder="12.5"
                        className="h-9 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                  {/* Navigation Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold"
                    >
                      {t('পূর্ববর্তী: আইনজীবী সনদ', 'Previous step')}
                    </Button>
                    <Button
                      type="button"
                      disabled={!selectedPlotId || !suitNo.trim()}
                      onClick={() => setCurrentStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <span>{t('পরবর্তী: নিষেধাজ্ঞা আরজি ও ডকেট', 'Next: Injunction Grounds & Docket')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 3: Injunction Grounds, Boundaries & Affidavit */}
              {currentStep === 3 && (
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3.5">
                  <div className="border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs">
                      <FileText className="w-4 h-4" />
                      <span>{t('ধাপ ৩: নালিশি চৌহদ্দি, নিষেধাজ্ঞার কারণ ও ডিজিটাল ডকেট ইস্যু', 'Step 3: Boundaries, Injunction Grounds & Docket Generation')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t(
                        'নালিশি ভূমির চারদিকের সীমানা, নিষেধাজ্ঞার কারণ উল্লেখ করুন এবং আইনি হলফনামায় সম্মতি দিয়ে ডিজিটাল ডকেট সম্পন্ন করুন।',
                        'Specify four boundaries, grounds of injunction, and agree to the statutory affidavit to issue the digital docket.'
                      )}
                    </p>
                  </div>

                  {/* Boundaries Grid (চৌহদ্দি) */}
                  <div className="pt-1">
                    <span className="block text-xs font-bold text-slate-800 mb-1">
                      {t('নালিশি ভূমির চারদিকের সীমানা ও চৌহদ্দি (Boundaries)', 'Disputed Land Boundaries (Chowhaddi)')}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <Label htmlFor="filing-boundary-north" className="text-[10px] font-bold text-slate-500 block mb-1">
                          {t('উত্তরে (North):', 'North:')}
                        </Label>
                        <Input
                          id="filing-boundary-north"
                          type="text"
                          value={boundaryNorth}
                          onChange={(e) => setBoundaryNorth(e.target.value)}
                          placeholder={t('সরকারি রাস্তা', 'Government Road')}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filing-boundary-south" className="text-[10px] font-bold text-slate-500 block mb-1">
                          {t('দক্ষিণে (South):', 'South:')}
                        </Label>
                        <Input
                          id="filing-boundary-south"
                          type="text"
                          value={boundarySouth}
                          onChange={(e) => setBoundarySouth(e.target.value)}
                          placeholder={t('রহিম মোল্লার জমি', "Rahim Molla's Land")}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filing-boundary-east" className="text-[10px] font-bold text-slate-500 block mb-1">
                          {t('পূর্বে (East):', 'East:')}
                        </Label>
                        <Input
                          id="filing-boundary-east"
                          type="text"
                          value={boundaryEast}
                          onChange={(e) => setBoundaryEast(e.target.value)}
                          placeholder={t('দাগ নং ১০২', 'Plot No. 102')}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="filing-boundary-west" className="text-[10px] font-bold text-slate-500 block mb-1">
                          {t('পশ্চিমে (West):', 'West:')}
                        </Label>
                        <Input
                          id="filing-boundary-west"
                          type="text"
                          value={boundaryWest}
                          onChange={(e) => setBoundaryWest(e.target.value)}
                          placeholder={t('খাস খাল', 'Khas Canal')}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description & Cause of Action */}
                  <div>
                    <Label htmlFor="filing-description-bn" className="block text-xs font-bold text-slate-800 mb-1">
                      {t('মোকদ্দমার কারণ ও আরজির সংক্ষিপ্ত সারসংক্ষেপ *', 'Cause of Action & Plaint Summary *')}
                    </Label>
                    <Textarea
                      id="filing-description-bn"
                      rows={2}
                      required
                      value={descriptionBn}
                      onChange={(e) => setDescriptionBn(e.target.value)}
                      placeholder={t(
                        'নালিশি জমিতে জোরপূর্বক জবরদখল ও প্রাচীর নির্মাণের অপচেষ্টার প্রেক্ষিতে স্বত্ব ঘোষণা ও অন্তর্বর্তীকালীন নিষেধাজ্ঞা প্রার্থনা।',
                        'Seeking declaration of title and temporary injunction against forced illegal encroachment and wall construction attempts.'
                      )}
                      className="text-xs"
                    />
                  </div>

                  {/* Legal Affidavit Checkbox */}
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="affidavit_check"
                      checked={affidavitAgreed}
                      onChange={(e) => setAffidavitAgreed(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="affidavit_check" className="text-[11px] text-slate-700 leading-snug cursor-pointer">
                      <span className="font-bold text-amber-900 block mb-0.5">
                        {t('বিজ্ঞ আইনজীবীর প্রত্যয়ন ও আইনি অঙ্গীকারনামা:', 'Advocate Certification & Legal Undertaking:')}
                      </span>
                      {t(
                        'আমি বিজ্ঞ আইনজীবী হিসেবে প্রত্যয়ন করছি যে, উল্লেখিত নালিশি দাগের ভূমির স্বত্ব ও সীমানা সংক্রান্ত মোকদ্দমা বিজ্ঞ আদালতে দাখিলকৃত হয়েছে। এই ডকেট জারির মাধ্যমে সংশ্লিষ্ট দাগে সিস্টেমে লিটিগেশন লক কার্যকর হওয়ার বিষয়ে আমি অবগত।',
                        'I, as an advocate, certify that a suit regarding the title and boundaries of the specified disputed plot has been filed in the honorable court. I acknowledge that issuing this docket will activate a system litigation lock on the respective plot.'
                      )}
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs font-bold"
                    >
                      {t('পূর্ববর্তী ধাপ', 'Previous step')}
                    </Button>
                    <Button
                      type="button"
                      disabled={submitting || !affidavitAgreed || !suitNo.trim()}
                      onClick={handleSubmitCase}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black gap-1.5 shadow-md"
                    >
                      {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      <span>{t('মোকদ্দমা দাখিল ও ডিজিটাল ডকেট ইস্যু', 'File Suit & Issue Digital Docket')}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Live Docket Preview Cockpit */}
            <div className="lg:col-span-5 lg:sticky lg:top-14 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-slate-800">কেস ডকেট লাইভ সামারি</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    ধাপ {toBanglaDigits(currentStep)} / ৩
                  </span>
                </div>

                {/* Plot summary pill */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">নালিশি তফসিল</span>
                    {selectedPlot ? (
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                        লক কার্যকর হবে
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">অনিবার্য</span>
                    )}
                  </div>
                  {selectedPlot ? (
                    <div>
                      <div className="font-black text-slate-900 text-xs">
                        দাগ নং {selectedPlot.dag_no_bn || selectedPlot.dag_no} ({selectedPlot.land_type_bn || 'ভিটা'})
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        মৌজা: {address.mouza_bn} | মোট: {toBanglaDigits(selectedPlot.total_area_decimal)} শতক
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-rose-600 font-semibold">
                      দাগ নির্বাচন বাকি (ধাপ ২)
                    </div>
                  )}
                </div>

                {/* Lawyer verification pill */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">বিজ্ঞ আইনজীবী</span>
                    {verifiedLawyer ? (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> সনদ সক্রিয়
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-semibold text-[9px]">
                        যাচাই বাকি
                      </span>
                    )}
                  </div>
                  {verifiedLawyer ? (
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{verifiedLawyer.lawyer_name_bn}</div>
                      <div className="text-[10px] font-mono text-indigo-700 font-semibold mt-0.5">
                        {verifiedLawyer.bar_council_no} ({verifiedLawyer.district_bar})
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500">
                      ধাপ ১ এ বার কাউন্সিল সনদ যাচাই করুন
                    </div>
                  )}
                </div>

                {/* Suit details pill */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">মোকদ্দমা আরজি তথ্য</span>
                  <div className="font-bold text-slate-800 text-xs truncate">
                    {suitNo || 'মোকদ্দমা নং অনির্ধারিত'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {courtName || 'আদালতের নাম অনির্ধারিত'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60 mt-1">
                    <span className="text-slate-500">নালিশি অংশ:</span>
                    <span className="font-bold text-indigo-700">{toBanglaDigits(disputedArea || '০')} শতক</span>
                  </div>
                </div>

                {/* Quick Advance / Submit Action Button */}
                <div className="pt-1">
                  {currentStep === 1 && (
                    <Button
                      type="button"
                      disabled={!verifiedLawyer}
                      onClick={() => setCurrentStep(2)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold gap-1.5 shadow-xs"
                    >
                      <span>পরবর্তী: জমি ও মোকদ্দমা বিবরণ ➔</span>
                    </Button>
                  )}
                  {currentStep === 2 && (
                    <div className="space-y-1">
                      <Button
                        type="button"
                        disabled={!selectedPlotId || !suitNo.trim()}
                        onClick={() => setCurrentStep(3)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold gap-1.5 shadow-xs"
                      >
                        <span>পরবর্তী: নিষেধাজ্ঞা আরজি ও ডকেট ➔</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(1)}
                        className="w-full text-slate-500 hover:text-slate-700 text-[11px]"
                      >
                        ← পূর্ববর্তী ধাপে ফিরুন
                      </Button>
                    </div>
                  )}
                  {currentStep === 3 && (
                    <div className="space-y-1">
                      <Button
                        type="button"
                        disabled={submitting || !affidavitAgreed || !suitNo.trim()}
                        onClick={handleSubmitCase}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold gap-1.5 shadow-xs"
                      >
                        {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>মোকদ্দমা দাখিল ও ডিজিটাল ডকেট ইস্যু</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentStep(2)}
                        className="w-full text-slate-500 hover:text-slate-700 text-[11px]"
                      >
                        ← পূর্ববর্তী ধাপে ফিরুন
                      </Button>
                    </div>
                  )}
                </div>

                {/* Anti-fraud reassurance badge */}
                <div className="p-2 rounded-lg bg-indigo-50/60 border border-indigo-100 flex items-start gap-1.5 text-[10px] text-indigo-900 leading-snug">
                  <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                  <span>দাখিলের সাথে সাথে দাগটিতে রেজিস্ট্রি ও নামজারিতে স্বয়ংক্রিয় লিটিগেশন লক কার্যকর হবে।</span>
                </div>
              </div>
            </div>
          </div>
        ) : docketResponse ? (
          <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              {/* Success Header */}
              <div className="text-center space-y-2 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 ring-8 ring-emerald-50">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>মোকদ্দমা সফলভাবে সিস্টেমে নথিভুক্ত হয়েছে</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  বাংলাদেশ ডিজিটাল ভূমি মোকদ্দমা ও আইনি ডকেট
                </h2>
                <p className="text-xs text-slate-500 max-w-xl mx-auto">
                  আপনার মোকদ্দমাটি অফিসিয়াল ডকেট নম্বর <span className="font-mono font-bold text-slate-800">{docketResponse.case_no}</span>{' '}
                  হিসেবে রেকর্ডভুক্ত হয়েছে এবং দাগ নং {docketResponse.plot.dag_no_bn || docketResponse.plot.dag_no}-এ লিটিগেশন সতর্কতা
                  সক্রিয় করা হয়েছে।
                </p>
              </div>

              {/* Official Docket Summary Card */}
              <Card className="rounded-2xl border-2 border-slate-200 bg-slate-50/50 relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl tracking-wider">
                  OFFICIAL LEGAL DOCKET
                </div>

                <CardHeader className="border-b border-slate-200 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ডকেট ট্র্যাকিং আইডি</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <CardTitle className="text-xl font-mono font-black text-indigo-900">{docketResponse.case_no}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(docketResponse.case_no)}
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          title="কপি করুন"
                        >
                          {copiedCode === docketResponse.case_no ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">দাখিলের তারিখ ও সময়</div>
                      <CardDescription className="text-xs font-bold text-slate-800 mt-0.5">
                        {new Date(docketResponse.verification.filed_at).toLocaleString('bn-BD')}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* 3-Column Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    {/* Col 1: Advocate Info */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="font-bold text-indigo-900 border-b border-slate-100 pb-1.5 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                          <span>বিজ্ঞ আইনজীবী (দাখিলকারী)</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-100 text-[#006A4E] border-emerald-300">
                          ✓ বার কাউন্সিল সনদপ্রাপ্ত
                        </Badge>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{docketResponse.lawyer.name_bn}</div>
                        <div className="text-[11px] text-slate-500">{docketResponse.lawyer.name_en}</div>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        <div>বার সনদ: <span className="font-mono font-bold">{docketResponse.lawyer.bar_council_no}</span></div>
                        <div>বার সমিতি: {docketResponse.lawyer.district_bar}</div>
                        <div>মোবাইল: {maskPhone(docketResponse.lawyer.phone, lang)}</div>
                      </div>
                    </div>

                    {/* Col 2: Land Schedule */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="font-bold text-indigo-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span>নালিশি ভূমির তফসিল</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        দাগ নং {docketResponse.plot.dag_no_bn || docketResponse.plot.dag_no}
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <div>মৌজা: {docketResponse.plot.mouza_bn}</div>
                        <div>উপজেলা: {docketResponse.plot.upazila_bn} | জেলা: {docketResponse.plot.district_bn}</div>
                        <div className="font-bold text-indigo-700">নালিশি অংশ: {docketResponse.court_details.disputed_area_decimal} শতক</div>
                      </div>
                    </div>

                    {/* Col 3: Court & Suit */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="font-bold text-indigo-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                        <Scale className="w-4 h-4 text-indigo-600" />
                        <span>আদালত ও মোকদ্দমা</span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{docketResponse.court_details.suit_no}</div>
                        <div className="text-[11px] text-slate-500">{docketResponse.court_details.court_name}</div>
                      </div>
                      <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                        <div>পর্যায়: <span className="font-semibold">{docketResponse.court_details.case_stage}</span></div>
                        <div>
                          বাদী: <span className="font-bold">{docketResponse.court_details.plaintiff_name}</span>{' '}
                          <span className="text-[10px] text-slate-500">
                            (এনআইডি: <span className="font-mono font-bold text-slate-700">{maskNid((docketResponse.court_details as any)?.plaintiff_nid || plaintiffNid, lang)}</span>)
                          </span>
                        </div>
                        <div>বিবাদী: <span className="font-bold">{docketResponse.court_details.defendant_name}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Boundaries & Verification Hash */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div>
                        <span className="font-bold text-slate-700">নালিশি চৌহদ্দি: </span>
                        <span className="text-slate-600">
                          উত্তর: {docketResponse.court_details.boundaries.north || 'অনির্দিষ্ট'} | দক্ষিণ:{' '}
                          {docketResponse.court_details.boundaries.south || 'অনির্দিষ্ট'} | পূর্ব:{' '}
                          {docketResponse.court_details.boundaries.east || 'অনির্দিষ্ট'} | পশ্চিম:{' '}
                          {docketResponse.court_details.boundaries.west || 'অনির্দিষ্ট'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Accordion type="single" collapsible className="mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3">
                        <AccordionItem value="crypto-proof" className="border-none">
                          <AccordionTrigger className="text-xs font-bold text-slate-700 py-2">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{t('কারিগরি ক্রিপ্টোগ্রাফিক ভ্যালিডেশন সিল (বিস্তারিত)', 'Cryptographic Proof (Details)')}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="mt-1 pt-2 border-t border-slate-200 font-mono text-[10px] text-slate-600 break-all select-all pb-2">
                            {docketResponse.verification.content_hash}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </div>

                  {/* Automated Gatekeeper Status Notice */}
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">সিস্টেমে লিটিগেশন লক ও ঝুঁকি অ্যালার্ট সক্রিয়:</div>
                      <div className="mt-0.5 leading-relaxed text-emerald-800">
                        এই মোকদ্দমাটির ভিত্তিতে 'জমি কেনার আগে যাচাই' (Check-Before-Buy) সার্চে দাগটি লিটিগেশন-চিহ্নিত হিসেবে প্রদর্শিত হবে।
                        একই সাথে সাব-রেজিস্ট্রার দলিল নিবন্ধন এবং এসি ল্যান্ড নামজারি প্রক্রিয়াতেও এই মোকদ্দমা তথ্য স্বয়ংক্রিয়ভাবে উপস্থাপিত হবে।
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="w-full sm:w-auto text-xs font-bold"
                >
                  নতুন মোকদ্দমা দাখিল করুন
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={handlePrint}
                    className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>ডকেট প্রিন্ট ও পিডিএফ ডাউনলোড</span>
                  </Button>
                  {onNavigateHome && (
                    <Button
                      type="button"
                      onClick={onNavigateHome}
                      className="flex-1 sm:flex-none bg-slate-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                    >
                      <span>হোমে ফিরুন</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  </div>
);
};
