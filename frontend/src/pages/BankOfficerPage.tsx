import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi, RiskReportResponse } from '../api/client';
import { toBanglaDigits, maskNid } from '../theme/tokens';
import { ResultHeroBanner } from '../components/ResultHeroBanner';
import { OfficerKhatianExplorer } from '../components/OfficerKhatianExplorer';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  Lock,
  Unlock,
  ShieldAlert,
  FileBadge,
  Printer,
  X,
  KeyRound,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  PlusCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { AddressCascader, AddressSelection } from '../components/AddressCascader';
import { triggerAppNotification } from '../components/NotificationCenter';
import { JargonTooltip } from '../components/JargonTooltip';
import { BankOfficerDashboard } from '@/components/officials/BankOfficerDashboard';

export type BankTab = 'overview' | 'mortgages' | 'new_lien' | 'noc' | 'khatian';

export interface BankOfficerPageProps {
  currentSubPage?: BankTab;
  onNavigateSubPage?: (page: string) => void;
}

export const BankOfficerPage: React.FC<BankOfficerPageProps> = ({
  currentSubPage,
  onNavigateSubPage,
}) => {
  const { lang, role, user, setRole, setUser, setToken, activeSubTab, setActiveSubTab, t } = useAppUI();
  const [subTab, setSubTab] = useState<BankTab>(() => {
    if (currentSubPage && ['overview', 'mortgages', 'new_lien', 'noc', 'khatian'].includes(currentSubPage)) {
      return currentSubPage;
    }
    if (activeSubTab && ['overview', 'mortgages', 'new_lien', 'noc', 'khatian'].includes(activeSubTab)) {
      return activeSubTab as BankTab;
    }
    return 'overview';
  });

  useEffect(() => {
    if (currentSubPage && currentSubPage !== subTab) {
      setSubTab(currentSubPage);
    }
  }, [currentSubPage]);
  const [plots, setPlots] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [mortgages, setMortgages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  const [plotId, setPlotId] = useState<number>(0);
  const [borrowerId, setBorrowerId] = useState<number>(0);
  const [bankNameBn, setBankNameBn] = useState(user?.office_bn?.split(',')[0] || '');
  const [bankNameEn, setBankNameEn] = useState(user?.office_en?.split(',')[0] || '');
  const [mortgagedArea, setMortgagedArea] = useState('');
  const [branchName, setBranchName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');

  const [collateralReport, setCollateralReport] = useState<RiskReportResponse | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nocModalData, setNocModalData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Search and filter for mortgage register
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RELEASED'>('ALL');

  // Address Cascader states
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedUpazila, setSelectedUpazila] = useState('');
  const [selectedMouzaId, setSelectedMouzaId] = useState('');

  // Selected Mortgage for Docket Modal
  const [selectedMortgageForModal, setSelectedMortgageForModal] = useState<any | null>(null);

  const bankPresets = [
    { bn: 'বাংলাদেশ কৃষি ব্যাংক', en: 'Bangladesh Krishi Bank', branch: 'সাভার শাখা' },
    { bn: 'সোনালী ব্যাংক পিএলসি', en: 'Sonali Bank PLC', branch: 'মতিঝিল শাখা' },
    { bn: 'ব্র্যাক ব্যাংক পিএলসি', en: 'BRAC Bank PLC', branch: 'গুলশান শাখা' },
    { bn: 'ইসলামী ব্যাংক বাংলাদেশ', en: 'Islami Bank Bangladesh', branch: 'ধানমন্ডি শাখা' },
    { bn: 'ডাচ-বাংলা ব্যাংক পিএলসি', en: 'Dutch-Bangla Bank PLC', branch: 'উত্তরা শাখা' },
  ];

  const loadData = () => {
    Promise.all([
      BhumiApi.getPlots(),
      BhumiApi.getPersons(),
      BhumiApi.getMortgages(),
      BhumiApi.getStatsSummary(),
    ]).then(([plts, pers, mrts, st]) => {
      setPlots(plts);
      setPersons(pers);
      setMortgages(mrts);
      setStats(st);
    }).catch(() => setErrorMsg(t('তথ্য লোড করা যায়নি।', 'Could not load bank records.')));
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      loadData();
    }, 8000);
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (activeSubTab && ['overview', 'mortgages', 'new_lien', 'noc', 'khatian'].includes(activeSubTab)) {
      setSubTab(activeSubTab as BankTab);
      if (activeSubTab === 'noc') {
        setStatusFilter('RELEASED');
      } else if (activeSubTab === 'mortgages') {
        setStatusFilter('ALL');
      }
    }
  }, [activeSubTab]);

  const handleTabChange = (target: BankTab) => {
    setSubTab(target);
    setActiveSubTab(target);
    if (target === 'noc') {
      setStatusFilter('RELEASED');
    } else if (target === 'mortgages') {
      setStatusFilter('ALL');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNocModalData(null);
      }
    };
    if (nocModalData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nocModalData]);

  const switchToBankRole = async (targetRole: UserRole = 'bank_officer') => {
    const res = await BhumiApi.switchDemoRole(targetRole);
    if (res?.access_token && res?.user) {
      setToken(res.access_token);
      setUser(res.user);
    } else {
      setRole(targetRole);
    }
  };

  const handleCheckCollateral = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await BhumiApi.checkBankCollateral({
        plot_id: Number(plotId), borrower_id: Number(borrowerId),
        area_mortgaged_decimal: Number(mortgagedArea),
      });
      setCollateralReport(res);
    } catch (err: any) {
      setErrorMsg((lang === 'bn' ? err?.response?.data?.message_bn : err?.response?.data?.message_en) || t('জামানত যাচাই ব্যর্থ।', 'Collateral check failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterLien = async () => {
    setErrorMsg(null);
    setActionMsg(null);
    setLoading(true);
    try {
      const res = await BhumiApi.createMortgage({
        plot_id: Number(plotId),
        borrower_id: Number(borrowerId),
        bank_name_bn: bankNameBn,
        bank_name_en: bankNameEn,
        area_mortgaged_decimal: Number(mortgagedArea),
        branch_name: branchName,
        loan_amount_bdt: Number(loanAmount),
      });
      setActionMsg(lang === 'bn' ? res.message_bn : res.message_en);
      triggerAppNotification({
        title_bn: 'নতুন ব্যাংক লিয়েন ও বন্ধক অন্তর্ভুক্ত',
        title_en: 'New Bank Mortgage Lien Registered',
        message_bn: `${bankNameBn} কর্তৃক প্লট আইডি #${plotId}-এ ৳${Number(loanAmount).toLocaleString()} টাকার জামানত লিয়েন অন্তর্ভুক্ত হয়েছে।`,
        message_en: `Mortgage lien of ৳${Number(loanAmount).toLocaleString()} registered by ${bankNameEn} for Plot #${plotId}.`,
        type: 'WARNING',
        targetTab: 'bank',
        targetSection: 'mortgages',
      });
      loadData();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.response?.data;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t(
              'এই দাগে ইতিমধ্যে একটি সক্রিয় মর্টগেজ রয়েছে! দ্বৈত বন্ধক (Double Mortgage) ব্লক করা হয়েছে।',
              'Plot already has an ACTIVE mortgage! Double mortgage blocked.'
            )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async (id: number) => {
    try {
      await BhumiApi.releaseMortgage(id);
      setActionMsg(
        t(
          'মর্টগেজ সফলভাবে অবমুক্ত করা হয়েছে এবং ডিজিটাল NOC প্রস্তুত!',
          'Mortgage successfully released and Digital NOC generated!'
        )
      );
      triggerAppNotification({
        title_bn: 'মর্টগেজ দায়মুক্তি ও ডিজিটাল NOC জারি',
        title_en: 'Mortgage Released & Digital NOC Issued',
        message_bn: `বন্ধক আইডি #${id} সম্পূর্ণ পরিশোধিত ও অবমুক্ত করা হয়েছে। ক্রিপ্টোগ্রাফিক NOC সনদ তৈরি সম্পন্ন।`,
        message_en: `Mortgage #${id} successfully released. Cryptographic NOC clearance generated.`,
        type: 'SUCCESS',
        targetTab: 'bank',
        targetSection: 'mortgages',
      });
      loadData();
    } catch {
      setErrorMsg(t('মর্টগেজ অবমুক্ত করতে সমস্যা হয়েছে।', 'Failed to release mortgage.'));
    }
  };

  const handleViewNoc = async (id: number) => {
    try {
      const res = await BhumiApi.getMortgageNoc(id);
      setNocModalData(res);
    } catch (err: any) {
      const msg = (lang === 'bn' ? err?.response?.data?.message_bn : err?.response?.data?.message_en) || t('এনওসি সনদ লোড করা সম্ভব হয়নি।', 'Failed to load NOC certificate.');
      setErrorMsg(msg);
    }
  };

  // Filtered plots for new lien form based on cascading address
  const filteredPlotsForLien = useMemo(() => {
    return plots.filter((p) => {
      if (selectedDivision && p.division_bn && p.division_bn !== selectedDivision) return false;
      if (selectedDistrict && p.district_bn && p.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && p.upazila_bn && p.upazila_bn !== selectedUpazila) return false;
      if (selectedMouzaId && p.mouza_id && Number(p.mouza_id) !== Number(selectedMouzaId)) return false;
      return true;
    });
  }, [plots, selectedDivision, selectedDistrict, selectedUpazila, selectedMouzaId]);

  const filteredMortgages = useMemo(() => {
    return mortgages.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }
      if (selectedDivision && m.division_bn && m.division_bn !== selectedDivision) return false;
      if (selectedDistrict && m.district_bn && m.district_bn !== selectedDistrict) return false;
      if (selectedUpazila && m.upazila_bn && m.upazila_bn !== selectedUpazila) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.bank_name_bn?.toLowerCase().includes(q) ||
        m.bank_name_en?.toLowerCase().includes(q) ||
        m.dag_no?.toString().includes(q) ||
        m.borrower_name_bn?.toLowerCase().includes(q) ||
        m.branch_name?.toLowerCase().includes(q)
      );
    });
  }, [mortgages, statusFilter, searchQuery, selectedDivision, selectedDistrict, selectedUpazila]);

  const tabList = useMemo(() => {
    const list = [
      {
        id: 'new_lien' as BankTab,
        label: t('নতুন বন্ধক', 'New Lien'),
        icon: <PlusCircle className="w-4 h-4" />,
      },
      {
        id: 'mortgages' as BankTab,
        label: t('বন্ধকী জমি', 'Mortgages'),
        icon: <Building2 className="w-4 h-4" />,
        count: toBanglaDigits(mortgages.length, lang),
      },
      {
        id: 'noc' as BankTab,
        label: t('অনাপত্তি সনদ (NOC)', 'Release NOCs'),
        icon: <FileBadge className="w-4 h-4" />,
        count: toBanglaDigits(mortgages.filter((m) => m.status === 'RELEASED').length, lang),
      },
      {
        id: 'khatian' as BankTab,
        label: t('খতিয়ান তল্লাশি', 'Title Search'),
        icon: <Search className="w-4 h-4" />,
      },
    ];
    return list;
  }, [role, mortgages, lang, t]);

  return (
    <div className="space-y-6">
      {/* Banking Companies Act Statutory Privacy Notice Banner */}
      <Card className="border-blue-300 bg-blue-50/80 shadow-xs">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-200 text-blue-900 shrink-0">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-950 text-sm">
                  {t('বিধিবদ্ধ গোপনীয়তা নোটিশ (ধারা ১২)', 'Statutory Notice (Sec 12)')}
                </span>
                <Badge className="bg-blue-200 text-blue-950 border-blue-300 font-mono text-[10px]">
                  SEC 12 COMPLIANT
                </Badge>
              </div>
              <p className="text-slate-700 text-xs mt-0.5">
                {t(
                  'ঋণগ্রহীতা ও বন্ধকি জামানতের তথ্যের সর্বোচ্চ গোপনীয়তা আইনত সংরক্ষিত।',
                  'Borrower and mortgage collateral records are protected by law.'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern Executive Officer Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#006A4E] to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-4 ring-emerald-50">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {role === 'bank_manager'
                  ? t('শাখা ব্যবস্থাপক কনসোল', 'Branch Manager')
                  : role === 'bank_officer'
                  ? t('ক্রেডিট অফিসার কনসোল', 'Credit Officer')
                  : t('ব্যাংক জামানত ডেস্ক', 'Bank Collateral Desk')}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-900">
                {role === 'bank_manager'
                  ? t('চেকার (অনুমোদন)', 'Checker (Approval)')
                  : role === 'bank_officer'
                  ? t('মেকার (এন্ট্রি)', 'Maker (Entry)')
                  : t('ব্যাংক ইউজার', 'Bank User')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {role === 'bank_manager'
                ? t(
                    'লিয়েন অনুমোদন, ডিজিটাল NOC প্রদান ও জামানত তদারকি।',
                    'Lien approval, digital NOC, and collateral oversight.'
                  )
                : t(
                    'জামানত যাচাই, নতুন বন্ধক ড্রাফট ও খতিয়ান তল্লাশি।',
                    'Collateral check, new lien draft, and title search.'
                  )}
            </p>
          </div>
        </div>

        {/* Cryptographic Trust Badge & Fast Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-bold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('সক্রিয় সেশন', 'Active')}</span>
          </div>
          <Button
            type="button"
            onClick={() => handleTabChange('new_lien')}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('নতুন বন্ধক', 'New Lien')}</span>
          </Button>
        </div>
      </div>

      {/* RBAC Guard Notice if not logged in as bank_officer, bank_manager or admin */}
      {role !== 'bank_officer' && role !== 'bank_manager' && role !== 'admin' && (
        <Alert className="bg-amber-50 border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0A1F1C]">
            <KeyRound className="w-4 h-4 text-[#C4891A]" />
            <AlertDescription>
              {t(
                'দাপ্তরিক অ্যাক্সেস নোটিশ: ব্যাংক মর্টগেজ ও ডিজিটাল NOC কন্ট্রোল ব্যবহার করতে ব্যাংক সেশনে প্রবেশ করুন।',
                'Access Notice: Switch to Bank Officer or Manager session for mortgage lien and Digital NOC controls.'
              )}
            </AlertDescription>
          </div>
          <Button
            onClick={() => switchToBankRole('bank_officer')}
            className="bg-[#074f38] hover:bg-[#053b2a] text-white font-bold text-xs shadow-xs"
          >
            {t('ব্যাংক প্যানেলে প্রবেশ করুন →', 'Activate Bank Officer Session →')}
          </Button>
        </Alert>
      )}

      {/* Executive shadcn Bank Officer Dashboard Tab */}
      {subTab === 'overview' && (
        <BankOfficerDashboard
          onNavigateTab={(tab) => handleTabChange(tab as BankTab)}
          stats={{
            active_liens: mortgages.length > 0 ? mortgages.length : 14,
            mortgage_value_bdt: 185000000,
            pending_noc: 3,
            flagged_anomalies: 2,
          }}
        />
      )}

      {/* Bank Officer Operational KPI Strip (Shown on Mortgages Overview Page) */}
      {subTab === "mortgages" && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Mortgages */}
        <div className="bg-amber-50/50 rounded-2xl border-2 border-amber-300 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
              <JargonTooltip term="LIEN">
                {t('সক্রিয় ব্যাংক লিয়েন', 'Active Mortgages')}
              </JargonTooltip>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-200 text-amber-900">
                {t('দায়বদ্ধ', 'Lien Active')}
              </span>
            </div>
            <div className="text-2xl font-black text-amber-950 mt-1.5">
              {toBanglaDigits(mortgages.filter((m) => m.status === 'ACTIVE').length, lang)}
            </div>
            <Button
              variant="link"
              onClick={() => handleTabChange('mortgages')}
              className="text-xs text-amber-900 font-bold p-0 h-auto mt-1.5 flex items-center gap-1 hover:no-underline group-hover:translate-x-0.5 transition-transform"
            >
              <span>{t('লিয়েন রেজিস্টার দেখুন', 'View Lien Register')}</span>
              <span>→</span>
            </Button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200">
            <Lock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Total Collateral */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('মোট ঋণকৃত জামানত', 'Total Collateral Value')}
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1.5">
              ৳{toBanglaDigits(
                (
                  mortgages
                    .filter((m) => m.status === 'ACTIVE')
                    .reduce((sum, m) => sum + Number(m.loan_amount_bdt || 0), 0) / 10000000
                ).toFixed(2),
                lang
              )}{' '}
              <span className="text-sm font-semibold text-slate-500">Cr</span>
            </div>
            <Button
              variant="link"
              onClick={() => handleTabChange('new_lien')}
              className="text-xs text-[#006A4E] font-semibold p-0 h-auto mt-1.5 flex items-center gap-1 hover:no-underline group-hover:translate-x-0.5 transition-transform"
            >
              <span>{t('নতুন লিয়েন অন্তর্ভুক্তি', 'New Mortgage Lien')}</span>
              <span>→</span>
            </Button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Issued NOC Certificates */}
        <div className="bg-emerald-50/50 rounded-2xl border-2 border-emerald-300 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <span>{t('ইস্যুকৃত ডিজিটাল NOC', 'Released NOCs')}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-200 text-emerald-900">
                {t('দায়মুক্ত', 'Clear')}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1.5">
              {toBanglaDigits(mortgages.filter((m) => m.status === 'RELEASED').length, lang)}
            </div>
            <Button
              variant="link"
              onClick={() => handleTabChange('noc')}
              className="text-xs text-emerald-800 font-bold p-0 h-auto mt-1.5 flex items-center gap-1 hover:no-underline group-hover:translate-x-0.5 transition-transform"
            >
              <span>{t('ছাড়পত্র সনদপত্র দেখুন', 'View Release NOCs')}</span>
              <span>→</span>
            </Button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0 border border-emerald-200">
            <FileBadge className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Double Mortgage Prevention */}
        <div className="bg-emerald-50/30 rounded-2xl border border-emerald-300/80 p-5 shadow-xs hover:shadow-sm transition-all duration-200 flex items-center justify-between group">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('দ্বৈত বন্ধক প্রতিরোধ', 'Double Mortgage Block')}
            </div>
            <div className="text-2xl font-black text-[#006A4E] mt-1.5">
              ১০০% {t('সুরক্ষিত', 'Protected')}
            </div>
            <Button
              variant="link"
              onClick={() => handleTabChange('khatian')}
              className="text-xs text-[#006A4E] font-semibold p-0 h-auto mt-1.5 flex items-center gap-1 hover:no-underline group-hover:translate-x-0.5 transition-transform"
            >
              <span>{t('জামানত খতিয়ান যাচাই', 'Verify Collateral')}</span>
              <span>→</span>
            </Button>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006A4E] flex items-center justify-center shrink-0 border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      )}

      {/* New Mortgage Registration Form */}
      {subTab === 'new_lien' && (
        <div className="panel p-6 space-y-6 animate-rise-delay">
          <div className="border-b border-[#006A4E]/10 pb-4">
            <h2 className="font-bold text-lg md:text-xl text-[#074f38] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#006A4E]" />
              <span>
                {t(
                  'নতুন ব্যাংক মর্টগেজ লিয়েন অন্তর্ভুক্তি ও জামানত লক',
                  'Register New Bank Mortgage Lien & Collateral Lock'
                )}
              </span>
            </h2>
            <p className="text-xs text-[#5F7A74] mt-0.5">
              {t(
                'একই জমি একাধিক ব্যাংকে বন্ধক রাখা (Double Mortgage) প্রতিরোধ করুন এবং প্লট লিয়েন কার্যকর করুন।',
                'Verify collateral ownership, prevent double-mortgaging, and lock the plot under active bank lien.'
              )}
            </p>
          </div>

          {/* Bank Presets */}
          <div className="space-y-1.5">
          <Label className="text-xs font-bold text-[#5F7A74] uppercase tracking-wider block mb-1.5">
            {t('দ্রুত ব্যাংক নির্বাচন করুন:', 'Quick Bank Presets:')}
          </Label>
          <div className="flex flex-wrap gap-2">
            {bankPresets.filter((b) => role === 'admin' || b.en === user?.office_en?.split(',')[0]).map((b) => (
              <Button
                key={b.bn}
                type="button"
                variant={bankNameBn === b.bn ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setBankNameBn(b.bn);
                  setBankNameEn(b.en);
                  setBranchName(b.branch);
                }}
                className={`h-8 text-xs font-bold transition-colors cursor-pointer ${
                  bankNameBn === b.bn
                    ? 'bg-[#006A4E] text-white hover:bg-[#00523C] shadow-xs'
                    : 'bg-[#EDF7F4]/80 text-[#0A1F1C]/90 border-[#006A4E]/12 hover:bg-[#EDF7F4]'
                }`}
              >
                {lang === 'bn' ? b.bn : b.en}
              </Button>
            ))}
          </div>
        </div>

        {/* Universal Address Cascader Toolbar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#006A4E]" />
              {t('জামানত জমির ভৌগোলিক অধিক্ষেত্র (বিভাগ ➔ জেলা ➔ উপজেলা ➔ মৌজা)', 'Jurisdiction Selector')}
            </span>
            {(selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setSelectedDivision('');
                  setSelectedDistrict('');
                  setSelectedUpazila('');
                  setSelectedMouzaId('');
                }}
                className="h-6 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1"
              >
                {t('ফিল্টার রিসেট', 'Reset Filter')}
              </Button>
            )}
          </div>
          <AddressCascader
            selectedDivision={selectedDivision}
            selectedDistrict={selectedDistrict}
            selectedUpazila={selectedUpazila}
            selectedMouzaId={selectedMouzaId}
            onChange={(sel: AddressSelection) => {
              setSelectedDivision(sel.division_bn);
              setSelectedDistrict(sel.district_bn);
              setSelectedUpazila(sel.upazila_bn);
              setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
            }}
          />
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1">
              {t('দাগ নম্বর নির্বাচন করুন:', 'Select Plot (Dag):')}
              {filteredPlotsForLien.length > 0 && (
                <span className="text-[10px] text-[#006A4E] ml-1 font-normal">
                  ({toBanglaDigits(filteredPlotsForLien.length, lang)} {t('টি দাগ', 'plots')})
                </span>
              )}
            </Label>
            <Select
              value={plotId ? String(plotId) : ''}
              onValueChange={(val) => setPlotId(val ? Number(val) : 0)}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold">
                <SelectValue placeholder={t('-- দাগ নির্বাচন করুন --', '-- Select Plot --')} />
              </SelectTrigger>
              <SelectContent>
                {(filteredPlotsForLien.length > 0 ? filteredPlotsForLien : plots).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {t('দাগ নং', 'Dag')} {p.dag_no} ({lang === 'bn' ? p.mouza_bn : p.mouza_en})
                    {Number(p.owner_sale_locked) === 1 ? ' [🔒 LOCKED]' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1">
              {t('ঋণগ্রহীতা (Borrower):', 'Borrower:')}
            </Label>
            <Select
              value={borrowerId ? String(borrowerId) : ''}
              onValueChange={(val) => setBorrowerId(val ? Number(val) : 0)}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold">
                <SelectValue placeholder={t('-- ঋণগ্রহীতা নির্বাচন করুন --', '-- Select Borrower --')} />
              </SelectTrigger>
              <SelectContent>
                {persons.map((per) => (
                  <SelectItem key={per.id} value={String(per.id)} className="text-xs">
                    {lang === 'bn' ? per.name_bn : per.name_en} ({maskNid(per.nid || per.nid_mock, lang)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1">
              {t('ব্যাংকের নাম ও শাখা:', 'Bank Name & Branch:')}
            </Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={bankNameBn}
                readOnly={role !== 'admin'}
                onChange={(e) => setBankNameBn(e.target.value)}
                placeholder="Bank Name"
                className="w-2/3 h-10 text-xs font-semibold"
              />
              <Input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Branch"
                className="w-1/3 h-10 text-xs font-semibold"
              />
            </div>
          </div>

          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1" htmlFor="bank-identity-en">{t('প্রতিষ্ঠানের ইংরেজি নাম', 'Assigned Bank (English)')}</Label>
            <Input id="bank-identity-en" className="h-10 text-xs font-semibold" value={bankNameEn} readOnly={role !== 'admin'} onChange={(e) => setBankNameEn(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1" htmlFor="mortgaged-area">{t('বন্ধকী জমি (শতাংশ)', 'Mortgaged Area (Decimal)')}</Label>
            <Input id="mortgaged-area" type="number" min="0.0001" step="any" className="h-10 text-xs font-semibold" value={mortgagedArea} onChange={(e) => setMortgagedArea(e.target.value)} />
          </div>
          <div>
            <Label className="block text-xs font-bold text-slate-800 mb-1">
              {t('ঋণের পরিমাণ (টাকা):', 'Loan Amount (BDT):')}
            </Label>
            <Input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="h-10 text-xs font-bold"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleCheckCollateral}
            disabled={loading}
            className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold gap-2 shadow-xs cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
            <span>{t('১. জামানতের মালিকানা ও পূর্ববর্তী ঋণ যাচাই', '1. Verify Collateral & Prior Liens')}</span>
          </Button>
          <Button
            onClick={handleRegisterLien}
            disabled={loading}
            className="bg-[#074f38] hover:bg-[#053b2a] text-white text-xs font-bold gap-2 shadow-xs cursor-pointer min-h-[40px] disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{t('২. নতুন মর্টগেজ লিয়েন লক করুন', '2. Register New Mortgage Lien Lock')}</span>
          </Button>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-[#FFF0F1] border-l-4 border-[#FF3B4A] font-bold text-xs text-[#0A1F1C] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF3B4A] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {actionMsg && (
          <div className="p-4 rounded-xl bg-[#EDF7F4] border-l-4 border-[#006A4E] font-bold text-xs text-[#006A4E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMsg}</span>
          </div>
        )}
      </div>
      )}

      {collateralReport && subTab === 'new_lien' && <ResultHeroBanner report={collateralReport} />}

      {/* Active & Released Mortgages Table */}
      {(subTab === 'mortgages' || subTab === 'noc') && (
      <div className="panel p-6 space-y-4">
        {/* Universal Address Cascader Toolbar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#006A4E]" />
              {t('অধিক্ষেত্র অনুযায়ী মর্টগেজ ফিল্টারিং (বিভাগ ➔ জেলা ➔ উপজেলা ➔ মৌজা)', 'Jurisdiction Filter')}
            </span>
            {(selectedDivision || selectedDistrict || selectedUpazila || selectedMouzaId) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setSelectedDivision('');
                  setSelectedDistrict('');
                  setSelectedUpazila('');
                  setSelectedMouzaId('');
                }}
                className="h-6 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-1"
              >
                {t('ফিল্টার রিসেট', 'Reset Filter')}
              </Button>
            )}
          </div>
          <AddressCascader
            selectedDivision={selectedDivision}
            selectedDistrict={selectedDistrict}
            selectedUpazila={selectedUpazila}
            selectedMouzaId={selectedMouzaId}
            onChange={(sel: AddressSelection) => {
              setSelectedDivision(sel.division_bn);
              setSelectedDistrict(sel.district_bn);
              setSelectedUpazila(sel.upazila_bn);
              setSelectedMouzaId(sel.mouza_id ? String(sel.mouza_id) : '');
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-[#074f38]">
              {t(
                'নিবন্ধিত ব্যাংক মর্টগেজ রেজিস্টার ও ডিজিটাল ছাড়পত্র (NOC) কন্ট্রোল',
                'Registered Bank Mortgages & Digital NOC Controls'
              )}
            </h2>
            <p className="text-xs text-[#5F7A74]">
              {t('সক্রিয় লিয়েন লক ও ঋণ পরিশোধের পর ইস্যুকৃত ডিজিটাল NOC সমূহ:', 'Active liens and generated NOCs:')}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'ACTIVE', 'RELEASED'] as const).map((st) => (
              <Button
                key={st}
                type="button"
                variant={statusFilter === st ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className={`h-8 px-3 text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#006A4E] text-white shadow-xs hover:bg-[#00523C]'
                    : 'bg-[#EDF7F4] text-[#5F7A74] border-slate-200 hover:bg-[#E4EFEA]'
                }`}
              >
                {st === 'ALL' ? t('সকল', 'All') : st === 'ACTIVE' ? t('সক্রিয় (ACTIVE)', 'Active') : t('অবমুক্ত (RELEASED)', 'Released')}
              </Button>
            ))}
          </div>
        </div>

        {/* Statutory Privacy Notice Banner under Banking Companies Act 1991 */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white flex items-center gap-2">
                <span>{t('বিধিবদ্ধ গোপনীয়তা নোটিশ: ব্যাংক-কোম্পানী আইন ১৯৯১ (ধারা ১২ ও বিশেষ বিধিমালা)', 'Statutory Privacy Notice: Banking Companies Act 1991 (Section 12)')}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {t('আইনি বাধ্যবাধকতা', 'Statutory')}
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                {t(
                  'তফসিলি ব্যাংক ও আর্থিক প্রতিষ্ঠানসমূহ কেবল ঋণের বিপরীতে প্রস্তাবিত বা দায়বদ্ধ জামানত (Collateral) সংক্রান্ত জমি ও লিয়েন রেকর্ড অনুসন্ধানের অনুমতিপ্রাপ্ত। অপ্রয়োজনীয় বা অননুমোদিত নাগরিক ব্যক্তিগত তথ্য অনুসন্ধান কঠোরভাবে দণ্ডনীয় অপরাধ।',
                  'Financial institutions are authorized strictly for pledged loan collateral and mortgage lien verification. Unauthorized searching of citizen records is punishable under banking privacy regulations.'
                )}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-[10px] font-mono text-emerald-400 border border-slate-700">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>COLLATERAL_ONLY_ACCESS</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('ব্যাংক, দাগ বা ঋণগ্রহীতার নাম খুঁজুন...', 'Search bank, dag or borrower...')}
            className="w-full pl-9 text-xs h-10"
          />
        </div>

        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[350px] scrollbar-thin rounded-xl border border-slate-200">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold">{t('ব্যাংক ও শাখা', 'Bank & Branch')}</TableHead>
                <TableHead className="font-bold">{t('মৌজা ও দাগ', 'Plot / Dag')}</TableHead>
                <TableHead className="font-bold">{t('ঋণগ্রহীতা', 'Borrower')}</TableHead>
                <TableHead className="font-bold">{t('ঋণের পরিমাণ', 'Loan Amount')}</TableHead>
                <TableHead className="font-bold">{t('স্ট্যাটাস', 'Status')}</TableHead>
                <TableHead className="font-bold text-right">{t('অ্যাকশন ও সনদ', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {filteredMortgages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                    {t('কোনো মর্টগেজ রেকর্ড পাওয়া যায়নি।', 'No mortgage records found.')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMortgages.map((m) => (
                  <TableRow key={m.id} className="hover:bg-emerald-50/50 transition-colors">
                    <TableCell className="font-bold text-slate-900">
                      <div>{lang === 'bn' ? m.bank_name_bn : m.bank_name_en}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{m.branch_name}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {t('দাগ নং', 'Dag')} {toBanglaDigits(m.dag_no, lang)}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">{m.borrower_name_bn}</TableCell>
                    <TableCell className="font-extrabold text-slate-900 font-mono">
                      ৳{toBanglaDigits(m.loan_amount_bdt.toLocaleString(), lang)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={m.status === 'ACTIVE' ? 'danger' : 'success'}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold inline-block"
                      >
                        {m.status === 'ACTIVE' ? '🔒 ACTIVE LIEN' : '✔ RELEASED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1.5 items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedMortgageForModal(m)}
                          className="h-8 w-8 rounded-lg border-slate-200 bg-white hover:bg-[#006A4E] hover:text-white text-[#006A4E]"
                          title={t('মর্টগেজ ডকেট ও জামানতের বিবরণ দেখুন', 'View Mortgage Docket')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {m.status === 'ACTIVE' ? (
                          <>
                            {role === 'bank_officer' ? (
                              <Badge
                                variant="warning"
                                title={t('ঋণ অবমুক্ত ও NOC অনুমোদন শাখা ব্যবস্থাপক (Checker) দ্বারা সম্পাদিত হয়।', 'Lien release & NOC approval must be performed by Branch Manager (Checker).')}
                                className="px-2 py-1 rounded font-bold text-[10px] inline-flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>{t('চেকার অনুমোদনাধীন', 'Pending Checker')}</span>
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRelease(m.id)}
                                className="h-8 px-2.5 text-xs font-bold text-[#006A4E] hover:bg-[#006A4E] hover:text-white flex items-center gap-1"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>{t('অবমুক্ত ও NOC প্রস্তুত', 'Release & Issue NOC')}</span>
                              </Button>
                            )}
                            <Badge
                              variant="secondary"
                              title={t('লিয়েন সক্রিয় থাকায় দায়মুক্তি সনদ (NOC) ইস্যু করা নিষিদ্ধ। ঋণ পরিশোধ করে অবমুক্ত করুন।', 'Lien is ACTIVE. NOC cannot be issued until released.')}
                              className="px-2 py-1 rounded text-slate-500 font-semibold text-[10px] inline-flex items-center gap-1 cursor-not-allowed"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>{t('NOC অনুপলব্ধ (লিয়েন সক্রিয়)', 'NOC Locked (Active)')}</span>
                            </Badge>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleViewNoc(m.id)}
                            className="h-8 px-2.5 bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                          >
                            <FileBadge className="w-3.5 h-3.5" />
                            <span>{t('ডিজিটাল NOC', 'Digital NOC')}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      {/* Collateral Khatian Explorer */}
      {subTab === 'khatian' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              {t(
                'ল্যান্ডটেক ধারা ১০ ও ব্যাংক গাইডলাইন: বাণিজ্যিক ব্যাংক কর্মকর্তা হিসেবে আপনার অনুসন্ধান এখতিয়ার শুধুমাত্র সংশ্লিষ্ট ব্যাংকে বন্ধকী বা লিয়েনভুক্ত জমিসমূহে সীমাবদ্ধ।',
                'LandTech Section 10 & Banking Guidelines: As a commercial bank officer, your inspection authority is restricted strictly to active mortgages and encumbered plots.'
              )}
            </span>
          </div>
          <OfficerKhatianExplorer
            onSelectPlotForAction={(selectedId) => {
              setPlotId(selectedId);
              handleTabChange('new_lien');
            }}
            actionLabel={t('এই প্লটে নতুন বন্ধক রাখুন', 'Register Mortgage on Plot')}
            actionType="lien"
          />
        </div>
      )}

      {/* Printable Digital NOC Certificate Modal */}
      <Dialog open={!!nocModalData} onOpenChange={(open) => !open && setNocModalData(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
          <DialogHeader className="print:hidden border-b pb-4">
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <FileBadge className="w-6 h-6 text-[#006A4E]" />
                <DialogTitle className="font-extrabold text-[#0A1F1C] text-base">
                  {t('ব্যাংক মর্টগেজ ছাড়পত্র প্রিভিউ', 'Mortgage NOC Certificate Preview')}
                </DialogTitle>
              </div>
              <Button
                type="button"
                onClick={() => window.print()}
                className="bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('প্রিন্ট / PDF সংরক্ষণ', 'Print / Save PDF')}</span>
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {t(
                'বাংলাদেশ ব্যাংক ও তফসিলি ব্যাংক ঋণ মুক্তায়ন বিধিমালা অনুসারে প্রস্তুতকৃত ডিজিটাল দায়মুক্তি সনদ',
                'Digitally authenticated statutory mortgage release certificate under Banking Companies Act 1991'
              )}
            </DialogDescription>
          </DialogHeader>

          {nocModalData && (
            <div className="p-6 border-4 border-double border-[#006A4E]/20 rounded-xl bg-white space-y-5 text-[#0A1F1C]">
              <div className="text-center space-y-1 border-b pb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#006A4E] text-white flex items-center justify-center font-bold text-lg mb-2 shadow-sm">
                  ব্যাংক
                </div>
                <h4 className="font-extrabold text-base tracking-wide text-[#0A1F1C]">
                  {nocModalData.lien?.bank_name_bn}
                </h4>
                <p className="text-xs font-bold text-[#006A4E]">
                  {nocModalData.lien?.branch_name} • ক্রেডিট অ্যাডমিনিস্ট্রেশন ও লিগ্যাল বিভাগ
                </p>
                <p className="text-[10px] text-[#5F7A74] font-mono mt-1">
                  OFFICIAL NOC CERTIFICATE NO: {nocModalData.noc_no}
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-center text-xs font-bold text-emerald-800">
                ✔ বন্ধক দায়মুক্তি প্রত্যয়ন: বর্ণিত দাগের জমির বিরুদ্ধে ব্যাংকের কোনো আর্থিক দাবি বা লিয়েন অবশিষ্ট নেই।
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#EDF7F4]/80 p-4 rounded-xl border border-[#006A4E]/12">
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">ঋণগ্রহীতা:</span>
                  <strong>{nocModalData.lien?.borrower_name_bn}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">এনআইডি নম্বর:</span>
                  <strong className="font-mono">{nocModalData.lien?.borrower_nid}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">মৌজা ও দাগ নং:</span>
                  <strong>{nocModalData.lien?.mouza_bn}, দাগ নং {nocModalData.lien?.dag_no}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">পরিশোধিত ঋণ:</span>
                  <strong className="font-mono">৳{Number(nocModalData.lien?.loan_amount_bdt).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">অবমুক্তির তারিখ:</span>
                  <strong>{nocModalData.issued_at || new Date().toLocaleDateString('bn-BD')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#5F7A74] block">বর্তমান লিয়েন স্ট্যাটাস:</span>
                  <strong className="text-emerald-700">{nocModalData.lien?.status}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#006A4E] shrink-0" />
                  <div>
                    <div className="text-xs font-black text-[#006A4E]">
                      {t('ডিজিটালভাবে সত্যায়িত অনাপত্তিপত্র (NOC)', 'Digitally Verified Discharge Certificate (NOC)')}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {t('বাংলাদেশ ব্যাংক ও তফসিলি ব্যাংক ঋণ মুক্তায়ন বিধিমালা অনুসারে কার্যকর', 'Executed per Bangladesh Bank & Scheduled Bank collateral release rules')}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#006A4E] text-white">
                  {t('১০০% দায়মুক্ত', 'Zero Encumbrance')}
                </span>
              </div>

              <Accordion type="single" collapsible className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3">
                <AccordionItem value="noc-proof" className="border-none">
                  <AccordionTrigger className="text-xs font-bold text-slate-700 py-2">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('কারিগরি অখণ্ডতা ও ক্রিপ্টোগ্রাফিক প্রমাণ (বিস্তারিত)', 'Cryptographic Proof & Digital Seal (Details)')}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="font-mono text-[10px] text-slate-600 break-all select-all space-y-1 pb-2">
                    <div><strong>SHA256_NOC_HASH:</strong> {nocModalData.noc_hash}</div>
                    <div><strong>ED25519_BANK_SIGNATURE:</strong> {nocModalData.signature}</div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="flex items-center justify-between pt-4 border-t">
                {nocModalData.qr_data_uri && (
                  <div className="flex items-center gap-3">
                    <img
                      src={nocModalData.qr_data_uri}
                      alt="NOC QR"
                      className="w-16 h-16 rounded border border-[#006A4E]/20 p-1 bg-white"
                    />
                    <div className="text-[10px] text-[#5F7A74]">
                      <p className="font-bold text-[#0A1F1C]/90">QR কোড স্ক্যান করে</p>
                      <p>ব্যাংক লিয়েন অবমুক্তি</p>
                      <p>অনলাইনে যাচাই করুন</p>
                    </div>
                  </div>
                )}

                <div className="text-right text-[10px] text-[#5F7A74]">
                  <div className="font-mono font-bold text-xs text-[#006A4E] border-b border-dashed border-slate-400 pb-0.5">
                    [Authorized Bank Seal]
                  </div>
                  <p className="font-bold mt-1">শাখা ব্যবস্থাপক / অনুমোদিত কর্মকর্তা</p>
                  <p>{nocModalData.lien?.bank_name_bn}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* BANK MORTGAGE & COLLATERAL DOCKET MODAL */}
      <Dialog open={!!selectedMortgageForModal} onOpenChange={(open) => !open && setSelectedMortgageForModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-[#006A4E]">
                <Building2 className="w-5 h-5" />
              </span>
              <div>
                <DialogTitle className="font-extrabold text-base text-slate-900">
                  {t('ব্যাংক জামানত ও মর্টগেজ লিয়েন ডকেট', 'Mortgage Lien & Collateral Docket')}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-mono">
                  REF #{selectedMortgageForModal?.id} · {selectedMortgageForModal?.bank_name_bn}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedMortgageForModal && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('ব্যাংক ও শাখা', 'Bank & Branch')}</span>
                    <strong className="text-slate-900 font-bold">{selectedMortgageForModal.bank_name_bn}</strong>
                    <div className="text-[10px] text-slate-500">{selectedMortgageForModal.branch_name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('ঋণগ্রহীতা (Borrower)', 'Borrower')}</span>
                    <strong className="text-slate-900 font-bold">{selectedMortgageForModal.borrower_name_bn}</strong>
                    <div className="text-[10px] text-slate-500 font-mono">NID: {selectedMortgageForModal.borrower_nid || '৯৯০০০০১০১২'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('মৌজা ও অধিক্ষেত্র', 'Mouza')}</span>
                    <strong className="text-slate-800">{selectedMortgageForModal.mouza_bn || 'বিরুলিয়া'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('দাগ নং', 'Plot No')}</span>
                    <strong className="text-[#006A4E] font-bold">
                      {toBanglaDigits(selectedMortgageForModal.dag_no_bn || selectedMortgageForModal.dag_no, lang)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('বন্ধককৃত জমির অংশ', 'Area')}</span>
                    <strong className="text-[#006A4E] font-bold">
                      {toBanglaDigits(selectedMortgageForModal.area_mortgaged_decimal || 12, lang)} {t('শতক', 'dec')}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('অনুমোদিত ঋণের পরিমাণ', 'Sanctioned Loan')}</span>
                    <strong className="text-slate-900 font-mono text-sm">
                      ৳{toBanglaDigits(Number(selectedMortgageForModal.loan_amount_bdt).toLocaleString(), lang)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">{t('লিয়েন স্ট্যাটাস', 'Lien Status')}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        selectedMortgageForModal.status === 'ACTIVE'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-emerald-100 text-[#006A4E] border border-emerald-300'
                      }`}
                    >
                      {selectedMortgageForModal.status === 'ACTIVE' ? '🔒 ACTIVE LIEN' : '✔ RELEASED (দায়মুক্ত)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-300 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white">{t('দ্বৈত মর্টগেজ সুরক্ষা সক্রিয়', 'Double Mortgage Protection Active')}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold">
                  {t('লেজার সমন্বিত', 'Ledger Synced')}
                </span>
              </div>

              <DialogFooter className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMortgageForModal(null)}
                  className="text-xs font-bold"
                >
                  {t('বন্ধ করুন', 'Close')}
                </Button>

                {selectedMortgageForModal.status === 'ACTIVE' && role !== 'bank_officer' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await handleRelease(selectedMortgageForModal.id);
                      setSelectedMortgageForModal(null);
                    }}
                    className="bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{t('লিয়েন অবমুক্ত ও ডিজিটাল NOC প্রদান', 'Release Lien & Issue NOC')}</span>
                  </Button>
                )}

                {selectedMortgageForModal.status === 'RELEASED' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const id = selectedMortgageForModal.id;
                      setSelectedMortgageForModal(null);
                      handleViewNoc(id);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <FileBadge className="w-3.5 h-3.5" />
                    <span>{t('ডিজিটাল NOC সনদপত্র দেখুন', 'View NOC Certificate')}</span>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
