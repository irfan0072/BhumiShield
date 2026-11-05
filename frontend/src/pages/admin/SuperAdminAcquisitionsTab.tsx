import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  MapPin,
  RefreshCw,
  X,
  Send,
  ExternalLink,
} from 'lucide-react';
import { toBanglaDigits } from '../../theme/tokens';
import { useAppUI } from '../../i18n';
import { BhumiApi } from '../../api/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';

interface SuperAdminAcquisitionsTabProps {
  acquisitionCases: any[];
  onRefresh: () => void;
  onOpenOverride?: (type: string, id: string | number, extra?: any) => void;
}

export const SuperAdminAcquisitionsTab: React.FC<SuperAdminAcquisitionsTabProps> = ({
  acquisitionCases,
  onRefresh,
  onOpenOverride,
}) => {
  const { t, lang } = useAppUI();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [caseNo, setCaseNo] = useState('');
  const [projectNameBn, setProjectNameBn] = useState('');
  const [projectNameEn, setProjectNameEn] = useState('');
  const [agencyBn, setAgencyBn] = useState('');
  const [sectionType, setSectionType] = useState('SECTION_4');
  const [districtBn, setDistrictBn] = useState('ঢাকা');
  const [upazilaBn, setUpazilaBn] = useState('সাভার');
  const [mouzaBn, setMouzaBn] = useState('বিরুলিয়া');
  const [totalLand, setTotalLand] = useState('25.5');
  const [compensationBdt, setCompensationBdt] = useState('35000000');
  const [status, setStatus] = useState('PRELIMINARY_NOTICE');
  const [createLoading, setCreateLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; err?: boolean } | null>(null);

  useEffect(() => {
    if (!createModalOpen && !selectedCase) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (createModalOpen) setCreateModalOpen(false);
        if (selectedCase) setSelectedCase(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createModalOpen, selectedCase]);

  const filteredCases = acquisitionCases.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(c.case_no || '').toLowerCase().includes(q) ||
      String(c.project_name_bn || '').toLowerCase().includes(q) ||
      String(c.project_name_en || '').toLowerCase().includes(q) ||
      String(c.acquiring_agency_bn || '').toLowerCase().includes(q) ||
      String(c.mouza_bn || '').toLowerCase().includes(q)
    );
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNameBn.trim()) {
      setToastMsg({ msg: t('প্রকল্পের নাম (বাংলায়) আবশ্যক।', 'Project name (BN) is required.'), err: true });
      return;
    }

    setCreateLoading(true);
    try {
      const res = await BhumiApi.createAcquisitionCase({
        case_no: caseNo.trim() || undefined,
        project_name_bn: projectNameBn.trim(),
        project_name_en: projectNameEn.trim() || projectNameBn.trim(),
        acquiring_agency_bn: agencyBn.trim() || 'জেলা প্রশাসন ভূমি অধিগ্রহণ শাখা',
        section_type: sectionType,
        district_bn: districtBn,
        upazila_bn: upazilaBn,
        mouza_bn: mouzaBn,
        total_land_decimal: Number(totalLand) || 10,
        estimated_compensation_bdt: Number(compensationBdt) || 10000000,
        status: status,
      });
      setToastMsg({ msg: res.message_bn || t('ভূমি অধিগ্রহণ কেস সফলভাবে নথিভুক্ত হয়েছে।', 'Acquisition case registered.') });
      setCreateModalOpen(false);
      // Reset form
      setProjectNameBn('');
      setProjectNameEn('');
      setCaseNo('');
      onRefresh();
    } catch (err: any) {
      const resp = err.response?.data;
      setToastMsg({ msg: resp?.message_bn || err.message, err: true });
    } finally {
      setCreateLoading(false);
    }
  };

  const getSectionBadge = (type: string) => {
    if (type === 'SECTION_4') {
      return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border-amber-200">ধারা ৪ (প্রাথমিক নোটিশ)</Badge>;
    }
    if (type === 'SECTION_7') {
      return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border-blue-200">ধারা ৭ (যৌথ তদন্ত)</Badge>;
    }
    if (type === 'SECTION_8') {
      return <Badge variant="outline" className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#006A4E] border-emerald-200">ধারা ৮ (রোয়েদাদ ও গেজেট)</Badge>;
    }
    return <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">{type}</Badge>;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast Notice */}
      {toastMsg && (
        <Alert
          className={`flex items-center justify-between text-xs font-bold rounded-xl border ${
            toastMsg.err ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.err ? <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#006A4E] shrink-0" />}
            <AlertDescription className="text-xs font-bold">{toastMsg.msg}</AlertDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setToastMsg(null)} className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </Button>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-[#006A4E] flex items-center justify-center shadow-2xs">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t('জেলা প্রশাসক কার্যালয় — ভূমি অধিগ্রহণ (LA) কেস তদারকি', 'DC Office — Land Acquisition (LA) Division')}</span>
              <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-[#006A4E] font-black text-[11px]">
                {toBanglaDigits(filteredCases.length, lang)} {t('টি কেস', 'Cases')}
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                'সরকারি উন্নয়ন প্রকল্প ও জাতীয় অবকাঠামোতে ভূমি অধিগ্রহণ, ধারা ৪/৭/৮ গেজেট ট্র্যাকিং ও ক্ষতিপূরণ বাজেট তদারকি।',
                'Public infrastructure acquisition projects, Section 4/7/8 gazette decrees, and compensation budgets.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="rounded-xl text-xs font-bold text-white bg-[#006A4E] hover:bg-[#005a42] flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t('নতুন এলএ কেস', 'New LA Case')}</span>
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#006A4E]" />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 z-10" />
          <Input
            type="text"
            placeholder={t('কেস নং, প্রকল্প, সংস্থা বা মৌজা দিয়ে খুঁজুন...', 'Search by case no, project, agency, or mouza...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 h-9 rounded-xl border border-slate-300 text-xs focus-visible:ring-2 focus-visible:ring-[#006A4E]"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { key: 'ALL', label_bn: 'সকল কেস', label_en: 'All' },
            { key: 'PRELIMINARY_NOTICE', label_bn: 'প্রাথমিক নোটিশ', label_en: 'Preliminary' },
            { key: 'JOINT_VERIFICATION', label_bn: 'যৌথ তদন্তাধীন', label_en: 'Joint Verification' },
            { key: 'OBJECTIONS_HEARING', label_bn: 'আপত্তি শুনানি', label_en: 'Hearings' },
            { key: 'AWARD_DECREED', label_bn: 'রোয়েদাদ ডিক্রি', label_en: 'Award Decreed' },
          ].map((st) => (
            <Button
              key={st.key}
              type="button"
              variant={statusFilter === st.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st.key)}
              className={`px-3 py-1 h-8 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                statusFilter === st.key
                  ? 'bg-[#006A4E] hover:bg-[#005a42] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 border-transparent text-slate-600'
              }`}
            >
              {lang === 'bn' ? st.label_bn : st.label_en}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-280px)] min-h-[300px] scrollbar-thin">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200/80">
              <TableRow>
                <TableHead className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('এলএ কেস নং ও গেজেট', 'LA Case No & Gazette')}</TableHead>
                <TableHead className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('প্রকল্পের নাম ও সংস্থা', 'Project & Agency')}</TableHead>
                <TableHead className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('এলাকা ও অধিক্ষেত্র', 'Location')}</TableHead>
                <TableHead className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('জমির পরিমাণ ও বাজেট', 'Land & Budget')}</TableHead>
                <TableHead className="px-4 py-3 font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('আইনি ধারা ও অবস্থা', 'Section & Status')}</TableHead>
                <TableHead className="px-4 py-3 text-right font-bold uppercase tracking-wider text-[10px] text-slate-600">{t('অ্যাকশন', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100">
              {filteredCases.length > 0 ? (
                filteredCases.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/70 transition">
                    <TableCell className="px-4 py-3 font-mono font-bold text-slate-900">
                      <span className="text-[#006A4E]">{c.case_no}</span>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        গেজেট: {c.gazette_no || 'বিজি-২০২৬/' + c.id} ({c.gazette_published_at || '২০২৬'})
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-extrabold text-slate-900 line-clamp-1">{c.project_name_bn}</div>
                      <div className="text-[10px] text-slate-500">{c.acquiring_agency_bn}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-bold text-slate-900">{c.mouza_bn}, {c.upazila_bn}</div>
                      <div className="text-[10px] text-slate-500">{c.district_bn} জেলা</div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="font-bold text-slate-900">
                        {toBanglaDigits(c.total_land_decimal, lang)} {t('শতাংশ', 'Decimal')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ৳ {toBanglaDigits((c.estimated_compensation_bdt || 0).toLocaleString(), lang)}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="space-y-1">
                        <div>{getSectionBadge(c.section_type)}</div>
                        <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 inline-block">
                          {c.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCase(c)}
                        className="px-2.5 py-1 h-7 rounded-lg text-xs font-bold border-slate-200 bg-white hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>{t('বিস্তারিত', 'View')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold">{t('কোনো ভূমি অধিগ্রহণ কেস পাওয়া যায়নি।', 'No acquisition cases found.')}</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Case Details Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        {selectedCase && (
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden border border-slate-200 rounded-2xl shadow-2xl">
            <DialogHeader className="bg-slate-900 px-6 py-4 text-white border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-black tracking-tight text-white">{selectedCase.case_no}</DialogTitle>
                  <DialogDescription className="text-xs text-slate-400">{selectedCase.project_name_bn}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">{t('প্রকল্প ও সংস্থা', 'Project & Agency')}</div>
                <div className="text-sm font-extrabold text-slate-900">{selectedCase.project_name_bn}</div>
                <div className="text-slate-500">{selectedCase.project_name_en}</div>
                <div className="text-[11px] font-bold text-[#006A4E] mt-1">{selectedCase.acquiring_agency_bn}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">{t('আইনি ধারা: ', 'Section: ')}</span>
                  <span className="font-bold text-slate-900">{selectedCase.section_type}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('মোট জমি: ', 'Total Land: ')}</span>
                  <span className="font-bold text-slate-900">{toBanglaDigits(selectedCase.total_land_decimal, lang)} শতাংশ</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('ক্ষতিপূরণ প্রাক্কলন: ', 'Compensation Budget: ')}</span>
                  <span className="font-bold text-slate-900">৳ {toBanglaDigits((selectedCase.estimated_compensation_bdt || 0).toLocaleString(), lang)}</span>
                </div>
                <div>
                  <span className="text-slate-500">{t('গেজেট নম্বর: ', 'Gazette Ref: ')}</span>
                  <span className="font-bold text-slate-900">{selectedCase.gazette_no || 'বিজি-২০২৬/০৮৮১'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">{t('অধিগ্রহণকৃত দাগসমূহ (Affected Plots):', 'Affected Plots:')}</div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(selectedCase.plot_ids || [1, 2]).map((pid: number) => (
                    <Badge key={pid} variant="secondary" className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-[#006A4E] border border-emerald-200 font-bold text-[11px]">
                      দাগ #{toBanglaDigits(pid, lang)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={() => setSelectedCase(null)}
                className="font-bold border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-slate-200 rounded-2xl shadow-2xl">
          <DialogHeader className="bg-slate-900 px-6 py-4 text-white border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight text-white">{t('নতুন ভূমি অধিগ্রহণ কেস এন্ট্রি', 'Register New LA Case')}</DialogTitle>
                <DialogDescription className="text-xs text-slate-400">{t('ডিসি কার্যালয় এলএ শাখা', 'DC Office LA Branch')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
            <div>
              <Label htmlFor="la-case-no" className="block text-[11px] font-bold text-slate-700 mb-1">{t('কেস নম্বর (Case No)', 'Case No')}</Label>
              <Input
                id="la-case-no"
                type="text"
                placeholder={t('LA-2026-XXXX (ফাঁকা রাখলে স্বয়ংক্রিয় জেনারেট হবে)', 'LA-2026-XXXX (Auto-generated if left blank)')}
                value={caseNo}
                onChange={(e) => setCaseNo(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-300 focus-visible:ring-2 focus-visible:ring-[#006A4E]"
              />
            </div>

            <div>
              <Label htmlFor="la-project-name-bn" className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রকল্পের নাম (বাংলায়)', 'Project Name (BN)')} *</Label>
              <Input
                id="la-project-name-bn"
                type="text"
                placeholder={t('যেমন: ঢাকা-আশুলিয়া এলিভেটেড এক্সপ্রেসওয়ে প্রকল্প', 'e.g. Dhaka-Ashulia Elevated Expressway Project')}
                value={projectNameBn}
                onChange={(e) => setProjectNameBn(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-300 focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                required
              />
            </div>

            <div>
              <Label htmlFor="la-project-name-en" className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রকল্পের নাম (ইংরেজিতে)', 'Project Name (EN)')}</Label>
              <Input
                id="la-project-name-en"
                type="text"
                placeholder={t('e.g. Dhaka-Ashulia Elevated Expressway', 'e.g. Dhaka-Ashulia Elevated Expressway')}
                value={projectNameEn}
                onChange={(e) => setProjectNameEn(e.target.value)}
                className="w-full text-xs rounded-lg border-slate-300 focus-visible:ring-2 focus-visible:ring-[#006A4E]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="la-agency-bn" className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রত্যাশী সংস্থা', 'Acquiring Agency')}</Label>
                <Input
                  id="la-agency-bn"
                  type="text"
                  value={agencyBn}
                  onChange={(e) => setAgencyBn(e.target.value)}
                  placeholder={t('যেমন: বাংলাদেশ সেতু কর্তৃপক্ষ', 'e.g. Bangladesh Bridge Authority')}
                  className="w-full text-xs rounded-lg border-slate-300 focus-visible:ring-2 focus-visible:ring-[#006A4E]"
                />
              </div>
              <div>
                <Label className="block text-[11px] font-bold text-slate-700 mb-1">{t('আইনি ধারা', 'Section Type')}</Label>
                <Select value={sectionType} onValueChange={setSectionType}>
                  <SelectTrigger className="w-full text-xs font-semibold rounded-lg border-slate-300 focus:ring-2 focus:ring-[#006A4E]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SECTION_4">{t('ধারা ৪ (প্রাথমিক নোটিশ)', 'Section 4 (Preliminary Notice)')}</SelectItem>
                    <SelectItem value="SECTION_7">{t('ধারা ৭ (যৌথ তদন্ত)', 'Section 7 (Joint Survey)')}</SelectItem>
                    <SelectItem value="SECTION_8">{t('ধারা ৮ (রোয়েদাদ ও গেজেট)', 'Section 8 (Award & Gazette)')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="la-district-bn" className="block text-[11px] font-bold text-slate-700 mb-1">{t('জেলা', 'District')}</Label>
                <Input
                  id="la-district-bn"
                  type="text"
                  value={districtBn}
                  onChange={(e) => setDistrictBn(e.target.value)}
                  placeholder={t('যেমন: ঢাকা', 'e.g. Dhaka')}
                  className="w-full text-xs rounded-lg border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="la-upazila-bn" className="block text-[11px] font-bold text-slate-700 mb-1">{t('উপজেলা', 'Upazila')}</Label>
                <Input
                  id="la-upazila-bn"
                  type="text"
                  value={upazilaBn}
                  onChange={(e) => setUpazilaBn(e.target.value)}
                  placeholder={t('যেমন: সাভার', 'e.g. Savar')}
                  className="w-full text-xs rounded-lg border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="la-mouza-bn" className="block text-[11px] font-bold text-slate-700 mb-1">{t('মৌজা', 'Mouza')}</Label>
                <Input
                  id="la-mouza-bn"
                  type="text"
                  value={mouzaBn}
                  onChange={(e) => setMouzaBn(e.target.value)}
                  placeholder={t('যেমন: বিরুলিয়া', 'e.g. Birulia')}
                  className="w-full text-xs rounded-lg border-slate-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="la-total-land" className="block text-[11px] font-bold text-slate-700 mb-1">{t('মোট জমি (শতাংশ)', 'Total Land (Decimals)')}</Label>
                <Input
                  id="la-total-land"
                  type="number"
                  step="0.1"
                  value={totalLand}
                  onChange={(e) => setTotalLand(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300"
                />
              </div>
              <div>
                <Label htmlFor="la-compensation-bdt" className="block text-[11px] font-bold text-slate-700 mb-1">{t('প্রাক্কলিত বাজেট (৳)', 'Estimated Budget (BDT)')}</Label>
                <Input
                  id="la-compensation-bdt"
                  type="number"
                  value={compensationBdt}
                  onChange={(e) => setCompensationBdt(e.target.value)}
                  className="w-full text-xs rounded-lg border-slate-300"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={createLoading}
                className="font-bold border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {t('বাতিল', 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="font-bold text-white bg-[#006A4E] hover:bg-[#005a42] flex items-center gap-1.5 shadow-xs"
              >
                {createLoading ? <span>{t('দাখিল হচ্ছে...', 'Saving...')}</span> : <span>{t('কেস নথিভুক্ত করুন', 'Register Case')}</span>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
