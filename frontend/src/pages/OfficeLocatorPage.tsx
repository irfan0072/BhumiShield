import React, { useState, useEffect, useMemo } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Landmark,
  HelpCircle,
  X,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Printer
} from 'lucide-react';
import { CitizenProblemTriageModal } from '../components/CitizenProblemTriageModal';
import { useOffices } from '../components/publicHooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OfficeItem {
  id: number;
  office_code: string;
  name_bn: string;
  name_en: string;
  office_type: string;
  division_bn: string;
  division_en: string;
  district_bn: string;
  district_en: string;
  upazila_bn: string;
  upazila_en: string;
  mouzas_served_json?: string;
  latitude: number | null;
  longitude: number | null;
  address_bn: string;
  address_en: string;
  contact_phone: string;
}

export const OfficeLocatorPage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  // Search & Filters State
  const [districtFilter, setDistrictFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('area') || '');

  // TanStack Query for Dynamic Offices Directory
  const queryParams = {
    district: districtFilter || undefined,
    upazila: upazilaFilter || undefined,
    type: typeFilter || undefined,
    q: searchQuery.trim() || undefined,
  };
  const officesQuery = useOffices(queryParams);

  // Appointment Modal State
  const [bookingOffice, setBookingOffice] = useState<OfficeItem | null>(null);
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentPhone, setAppointmentPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState('10:00 AM - 11:30 AM');
  const [appointmentServiceType, setAppointmentServiceType] = useState('MUTATION');
  const [appointmentCaseRef, setAppointmentCaseRef] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  // Citizen Problem Triage Launcher Modal
  const [triageModalOpen, setTriageModalOpen] = useState(false);

  const rawOffices: OfficeItem[] = officesQuery.data || [];

  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    rawOffices.forEach((o) => {
      if (o.district_bn) set.add(o.district_bn);
      else if (o.district_en) set.add(o.district_en);
    });
    return Array.from(set).sort();
  }, [rawOffices]);

  const availableUpazilas = useMemo(() => {
    const set = new Set<string>();
    rawOffices.forEach((o) => {
      if (districtFilter) {
        const matchesDistrict = (o.district_bn === districtFilter) || (o.district_en === districtFilter);
        if (!matchesDistrict) return;
      }
      if (o.upazila_bn) set.add(o.upazila_bn);
      else if (o.upazila_en) set.add(o.upazila_en);
    });
    return Array.from(set).sort();
  }, [rawOffices, districtFilter]);

  const filteredOffices = rawOffices.filter((off) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (off.name_bn || '').toLowerCase().includes(q) ||
      (off.name_en || '').toLowerCase().includes(q) ||
      (off.upazila_bn || '').toLowerCase().includes(q) ||
      (off.district_bn || '').toLowerCase().includes(q) ||
      (off.address_bn || '').toLowerCase().includes(q)
    );
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingOffice || !appointmentName.trim() || !appointmentPhone.trim() || !appointmentDate) return;
    setBookingLoading(true);
    setBookingError('');

    try {
      const res = await BhumiApi.createAppointment({
        office_id: bookingOffice.id,
        office_name_bn: bookingOffice.name_bn,
        citizen_name_bn: appointmentName.trim(),
        citizen_phone: appointmentPhone.trim(),
        appointment_date: appointmentDate,
        time_slot: appointmentTimeSlot,
        service_category: appointmentServiceType,
        case_ref: appointmentCaseRef.trim(),
      });
      setBookingResult(res);
    } catch (err: any) {
      setBookingError(
        err?.response?.data?.message_bn ||
        t('অ্যাপয়েন্টমেন্ট স্লট সংরক্ষণ করতে সমস্যা হয়েছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'Failed to book appointment slot. Please try again.')
      );
    } finally {
      setBookingLoading(false);
    }
  };

  const handleResetFilters = () => {
    setDistrictFilter('');
    setUpazilaFilter('');
    setTypeFilter('');
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-24 relative overflow-hidden">
      {/* Ambient background glow & subtle dot pattern */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 -z-10 pointer-events-none" />

      {/* Top Banner Header (Linear / Vercel Bento-Grid Style) */}
      <section className="pt-8 sm:pt-12 pb-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shadow-xs text-xs font-semibold text-[#006A4E]">
            <Building2 className="w-4 h-4 text-[#006A4E]" />
            <span>{t('ভূমি অফিস ডিরেক্টরি', 'Office Directory')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-snug">
            {t('নিকটস্থ ভূমি অফিস', 'Nearby Land Offices')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            {t(
              'সহকারী কমিশনার (ভূমি) ও সাব-রেজিস্ট্রি অফিসের ঠিকানা ও যোগাযোগ।',
              'Addresses and contact info for AC Land and Sub-Registry offices.'
            )}
          </p>

          {/* Quick Problem Triage & 16122 Callout */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setTriageModalOpen(true)}
              className="bg-[#006A4E] text-white hover:bg-[#00553e] font-black text-xs sm:text-sm h-11 px-5 rounded-xl shadow-md shadow-emerald-900/10 cursor-pointer flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              <span>{t('সমস্যা ও অফিস গাইড', 'Problem & Office Guide')}</span>
            </Button>

            <a
              href="tel:16122"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition shadow-xs"
            >
              <PhoneCall className="w-3.5 h-3.5 text-[#006A4E]" />
              <span>{t('হেল্পলাইন: ১৬১২২', 'Helpline: 16122')}</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 space-y-6">
        {/* Search & Filter Controls Card */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-[#006A4E]" />
              <h2 className="text-sm font-bold text-slate-800">
                {t('অফিস অনুসন্ধান ও ফিল্টার', 'Search & Filter Offices')}
              </h2>
            </div>
            {(districtFilter || upazilaFilter || typeFilter || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 px-2.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span>{t('ফিল্টার মুছুন', 'Clear Filters')}</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">{t('অফিস বা এলাকার নাম', 'Office Name or Area')}</label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('যেমন: সাভার, ধামরাই...', 'e.g. Savar, Dhamrai...')}
                className="h-10 text-sm border-slate-300"
              />
            </div>

            {/* Office Type Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">{t('দপ্তরের ধরন', 'Office Type')}</Label>
              <Select
                value={typeFilter || 'ALL'}
                onValueChange={(val) => setTypeFilter(val === 'ALL' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল দপ্তর', 'All Office Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল দপ্তর', 'All Office Types')}</SelectItem>
                    <SelectItem value="AC_LAND">{t('সহকারী কমিশনার (ভূমি) কার্যালয়', 'AC Land Office')}</SelectItem>
                    <SelectItem value="SUB_REGISTRY">{t('সাব-রেজিস্ট্রি অফিস', 'Sub-Registry Office')}</SelectItem>
                    <SelectItem value="SETTLEMENT">{t('সেটেলমেন্ট অফিস (জরিপ)', 'Settlement Survey Office')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* District Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">{t('জেলা', 'District')}</Label>
              <Select
                value={districtFilter || 'ALL'}
                onValueChange={(val) => {
                  setDistrictFilter(val === 'ALL' ? '' : val);
                  setUpazilaFilter('');
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল জেলা', 'All Districts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল জেলা', 'All Districts')}</SelectItem>
                    {availableDistricts.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Upazila Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">{t('উপজেলা', 'Upazila')}</Label>
              <Select
                value={upazilaFilter || 'ALL'}
                onValueChange={(val) => setUpazilaFilter(val === 'ALL' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল উপজেলা', 'All Upazilas')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল উপজেলা', 'All Upazilas')}</SelectItem>
                    {availableUpazilas.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* 4-State UI Coverage: Offices Directory */}
        {officesQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
                <Skeleton className="h-6 w-32 bg-slate-200" />
                <Skeleton className="h-5 w-3/4 bg-slate-200" />
                <Skeleton className="h-12 w-full bg-slate-200" />
                <Skeleton className="h-10 w-full bg-slate-200" />
              </Card>
            ))}
          </div>
        ) : officesQuery.isError ? (
          <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-rose-900">
              {t('অফিস ডিরেক্টরি লোড করতে সমস্যা হয়েছে', 'Failed to load offices directory')}
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              {t('ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।', 'Please check your connection and retry.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => officesQuery.refetch()}
              className="border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('পুনরায় চেষ্টা করুন', 'Retry')}</span>
            </Button>
          </div>
        ) : filteredOffices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">
              {t('কোনো অফিস পাওয়া যায়নি', 'No land offices found')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('অনুগ্রহ করে অন্য জেলা বা উপজেলা নির্বাচন করুন।', 'Please adjust your filter parameters or search terms.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="border-slate-300 cursor-pointer"
            >
              {t('সকল অফিস দেখুন', 'View All Offices')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOffices.map((office) => (
              <Card
                key={office.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#006A4E]/50 hover:shadow-md transition p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      className={
                        office.office_type === 'AC_LAND'
                          ? 'bg-emerald-100 text-[#006A4E] border-emerald-300 font-bold text-[10px]'
                          : office.office_type === 'SUB_REGISTRY'
                          ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px]'
                          : 'bg-purple-100 text-purple-800 border-purple-300 font-bold text-[10px]'
                      }
                    >
                      {office.office_type === 'AC_LAND'
                        ? t('এসি ল্যান্ড অফিস', 'AC Land Office')
                        : office.office_type === 'SUB_REGISTRY'
                        ? t('সাব-রেজিস্ট্রি কার্যালয়', 'Sub-Registry')
                        : t('সেটেলমেন্ট অফিস', 'Settlement Office')}
                    </Badge>
                    <span className="text-[11px] font-mono text-slate-500">
                      {office.office_code}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    {lang === 'bn' ? office.name_bn : office.name_en}
                  </h3>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-start gap-1.5 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{lang === 'bn' ? office.address_bn : office.address_en}</span>
                    </p>
                    <p className="flex items-center gap-1.5 font-mono text-slate-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <a href={`tel:${office.contact_phone}`} className="hover:underline font-bold">
                        {office.contact_phone || '০২-৯৯৮৮৭৭৬৬'}
                      </a>
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{t('রবি - বৃহস্পতি: সকাল ৯:০০ - বিকাল ৫:০০', 'Sun - Thu: 9:00 AM - 5:00 PM')}</span>
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <CardFooter className="p-0 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                  {onNavigate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate(`map?office_id=${office.id}`)}
                      className="h-10 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t('মানচিত্রে দেখুন', 'On Map')}</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => {
                      setBookingOffice(office);
                      setBookingResult(null);
                      setBookingError('');
                    }}
                    className="h-10 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t('অ্যাপয়েন্টমেন্ট', 'Book Slot')}</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* APPOINTMENT BOOKING MODAL */}
      <Dialog open={Boolean(bookingOffice)} onOpenChange={(open) => !open && setBookingOffice(null)}>
        <DialogContent className="max-w-md p-6 border border-slate-200 rounded-3xl bg-white space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#006A4E]" />
              <DialogTitle className="text-lg font-black text-slate-900">
                {t('অফিস অ্যাপয়েন্টমেন্ট বুকিং', 'Book Office Appointment')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              {bookingOffice?.name_bn} · {bookingOffice?.upazila_bn}
            </DialogDescription>
          </DialogHeader>

          {bookingResult ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  {t('অ্যাপয়েন্টমেন্ট টোকেন নং:', 'Appointment Token:')}
                </span>
                <span className="text-xl font-black font-mono text-[#006A4E] bg-white px-3 py-1 rounded-lg border border-emerald-200 inline-block">
                  {bookingResult.token || 'APPT-2026-1048'}
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-900">
                {bookingResult.message_bn || t('আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়েছে।', 'Appointment confirmed.')}
              </p>
              <div className="text-[11px] text-slate-500">
                {t('নির্ধারিত সময়ে মূল কাগজপত্রসহ অফিসে উপস্থিত থাকুন।', 'Please bring all original deeds & NID.')}
              </div>
              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setBookingOffice(null)}
                  className="w-full bg-[#006A4E] text-white font-bold cursor-pointer"
                >
                  {t('সম্পন্ন', 'Done')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-3 text-xs">
              {bookingError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {bookingError}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('আপনার পূর্ণ নাম *', 'Full Name *')}</label>
                <Input
                  required
                  value={appointmentName}
                  onChange={(e) => setAppointmentName(e.target.value)}
                  placeholder={t('যেমন: মো. রফিকুল ইসলাম', 'e.g. Md. Rafiqul Islam')}
                  className="h-10 text-sm border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('মোবাইল নম্বর *', 'Phone Number *')}</label>
                <Input
                  required
                  type="tel"
                  value={appointmentPhone}
                  onChange={(e) => setAppointmentPhone(e.target.value)}
                  placeholder="01712345678"
                  className="h-10 text-sm border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">{t('তারিখ *', 'Date *')}</label>
                  <Input
                    required
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="h-10 text-xs border-slate-300 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-slate-700">{t('সময় সূচি', 'Time Slot')}</Label>
                  <Select
                    value={appointmentTimeSlot}
                    onValueChange={(val) => setAppointmentTimeSlot(val)}
                  >
                    <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                      <SelectValue placeholder="সকাল ১০:০০ - ১১:৩০" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="10:00 AM - 11:30 AM">{t('সকাল ১০:০০ - ১১:৩০', '10:00 AM - 11:30 AM')}</SelectItem>
                        <SelectItem value="12:00 PM - 01:30 PM">{t('দুপুর ১২:০০ - ১:৩০', '12:00 PM - 01:30 PM')}</SelectItem>
                        <SelectItem value="02:30 PM - 04:00 PM">{t('বিকাল ২:৩০ - ৪:০০', '02:30 PM - 04:00 PM')}</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">{t('সেবার ধরন', 'Service Category')}</Label>
                <Select
                  value={appointmentServiceType}
                  onValueChange={(val) => setAppointmentServiceType(val)}
                >
                  <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                    <SelectValue placeholder={t('ই-নামজারি সংক্রান্ত শুনানি', 'e-Mutation Hearing')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="MUTATION">{t('ই-নামজারি সংক্রান্ত শুনানি', 'e-Mutation Hearing')}</SelectItem>
                      <SelectItem value="DEED_COPY">{t('দলিলের নকল / পর্চা উত্তোলন', 'Certified Deed / Porcha')}</SelectItem>
                      <SelectItem value="DISPUTE">{t('সীমানা বিরোধ বা আপত্তি দাখিল', 'Boundary Dispute / Objection')}</SelectItem>
                      <SelectItem value="CONSULTATION">{t('সাধারণ ভূমি আইনি পরামর্শ', 'General Land Legal Advice')}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('মামলা বা আবেদন নম্বর (ঐচ্ছিক)', 'Case / Tracking No (Optional)')}</label>
                <Input
                  value={appointmentCaseRef}
                  onChange={(e) => setAppointmentCaseRef(e.target.value)}
                  placeholder="যেমন: MUT-2026-101"
                  className="h-10 text-xs border-slate-300 font-mono"
                />
              </div>

              <DialogFooter className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingOffice(null)}
                  className="cursor-pointer text-xs"
                >
                  {t('বাতিল', 'Cancel')}
                </Button>

                <Button
                  type="submit"
                  disabled={bookingLoading}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {bookingLoading ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('বুকিং হচ্ছে...', 'Booking...')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('অ্যাপয়েন্টমেন্ট নিশ্চিত করুন', 'Confirm Appointment')}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Citizen Problem Triage Launcher Modal */}
      {triageModalOpen && (
        <CitizenProblemTriageModal
          isOpen={triageModalOpen}
          onClose={() => setTriageModalOpen(false)}
          onNavigate={(route) => {
            setTriageModalOpen(false);
            if (!route) return;
            if (route.startsWith('http')) {
              window.open(route, '_blank');
            } else if (route.startsWith('tickets')) {
              onNavigate?.('home');
            } else if (['plots', 'vault', 'deeds', 'transfers', 'disputes'].includes(route)) {
              onNavigate?.('home');
            } else {
              onNavigate?.(route);
            }
          }}
        />
      )}
    </div>
  );
};
