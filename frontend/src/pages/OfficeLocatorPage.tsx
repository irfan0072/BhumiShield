import {SourceCards} from '../components/sources/SourceCards';
import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
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
  X
} from 'lucide-react';

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
  mouzas_served_json: string;
  latitude: number | null;
  longitude: number | null;
  address_bn: string;
  address_en: string;
  contact_phone: string;
}

interface OfficeLocatorPageProps {
  onNavigate?: (tab: string) => void;
}

export const OfficeLocatorPage: React.FC<OfficeLocatorPageProps> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();
  const [offices, setOffices] = useState<OfficeItem[]>([]);
  const [linkedOfficeId, setLinkedOfficeId] = useState(() => Number(new URLSearchParams(window.location.search).get('office_id')) || 0);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => new URLSearchParams(window.location.search).get('area') || '');

  // Appointment Modal
  const [bookingOffice, setBookingOffice] = useState<OfficeItem | null>(null);
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentPhone, setAppointmentPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTimeSlot, setAppointmentTimeSlot] = useState('10:00 AM - 11:30 AM');
  const [appointmentServiceType, setAppointmentServiceType] = useState('GENERAL_INQUIRY');
  const [appointmentCaseRef, setAppointmentCaseRef] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState<any | null>(null);
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  const fetchOffices = () => {
    setLoading(true);
    const params: any = {};
    if (linkedOfficeId > 0) params.office_id = linkedOfficeId;
    if (typeFilter) params.type = typeFilter;
    if (districtFilter) params.district = districtFilter;
    if (upazilaFilter) params.upazila = upazilaFilter;
    if (searchQuery.trim()) params.q = searchQuery.trim();

    BhumiApi.listOffices(params)
      .then((res: any) => {
        setOffices(Array.isArray(res) ? res : (res?.items || []));
      })
      .catch((err) => {
        console.error('Failed to load offices', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOffices();
  }, [typeFilter, districtFilter, upazilaFilter, linkedOfficeId]);

  const getOfficeTypeBadge = (type: string) => {
    switch (type) {
      case 'registry':
      case 'sub_registry':
        return {
          labelBn: 'সাব-রেজিস্ট্রি অফিস',
          labelEn: 'Sub-Registry Office',
          bg: 'bg-emerald-50 text-[#006A4E] border-emerald-200',
        };
      case 'ac_land':
        return {
          labelBn: 'উপজেলা ভূমি অফিস (এসি ল্যান্ড)',
          labelEn: 'Upazila Land Office',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'settlement':
        return {
          labelBn: 'জোনাল সেটেলমেন্ট অফিস',
          labelEn: 'Zonal Settlement Office',
          bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        };
      case 'service_point':
        return {
          labelBn: 'ইউনিয়ন ডিজিটাল সেন্টার (সার্ভিস পয়েন্ট)',
          labelEn: 'UDC Service Point',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'bank_branch':
      case 'bank':
        return {
          labelBn: 'তফসিলি ব্যাংক শাখা',
          labelEn: 'Bank Branch',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      case 'admin_cell':
        return {
          labelBn: 'জেলা প্রশাসন ও গভর্ন্যান্স সেল',
          labelEn: 'District Administration / Cell',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
        };
      default:
        return {
          labelBn: 'সরকারি অফিস',
          labelEn: 'Government Office',
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
        };
    }
  };

  const filteredOffices = offices.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch =
      item.name_bn?.toLowerCase().includes(q) || item.name_en?.toLowerCase().includes(q);
    const codeMatch = item.office_code?.toLowerCase().includes(q);
    const upazilaMatch =
      item.upazila_bn?.toLowerCase().includes(q) || item.upazila_en?.toLowerCase().includes(q);
    const districtMatch =
      item.district_bn?.toLowerCase().includes(q) || item.district_en?.toLowerCase().includes(q);
    const mouzaMatch = item.mouzas_served_json?.toLowerCase().includes(q);
    const addressMatch =
      item.address_bn?.toLowerCase().includes(q) || item.address_en?.toLowerCase().includes(q);
    return nameMatch || codeMatch || upazilaMatch || districtMatch || mouzaMatch || addressMatch;
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingOffice) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      const res = await BhumiApi.createAppointment({
        office_id: bookingOffice.id,
        citizen_name_bn: appointmentName.trim(),
        citizen_phone: appointmentPhone.trim(),
        slot_date: appointmentDate,
        slot_time: appointmentTimeSlot,
        service_type: appointmentServiceType,
        case_reference: appointmentCaseRef.trim() || undefined,
        notes_bn: `${appointmentServiceType} সংক্রান্ত সেবা সাক্ষাত। পছন্দের সময় স্লট: ${appointmentTimeSlot}`,
      });
      setBookingResult(res.appointment);
      setBookingSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.detail?.message_bn || err?.response?.data?.message || err.message;
      setBookingError(msg || t('বুকিং প্রক্রিয়াকরণে ত্রুটি হয়েছে।', 'Failed to book appointment.'));
    } finally {
      setBookingLoading(false);
    }
  };

  const handleViewOnMap = (off: OfficeItem) => {
    if (off.latitude && off.longitude) {
      onNavigate?.(`map?lat=${off.latitude}&lng=${off.longitude}&office_id=${off.id}`);
    } else {
      setMapNotice(
        t(
          'মানচিত্রে দেখানো যাচ্ছে না — এই দপ্তরের GPS স্থানাঙ্ক জরিপ চলমান।',
          'Map unavailable — GPS coordinates for this office are currently being surveyed.'
        )
      );
      setTimeout(() => setMapNotice(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {linkedOfficeId > 0 && (
          <div className="source-panel">
            <p>{t('সংযুক্ত অফিসটি দেখানো হচ্ছে।', 'Showing the linked office.')}</p>
            <button
              onClick={() => {
                setLinkedOfficeId(0);
                const url = new URL(window.location.href);
                url.searchParams.delete('office_id');
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
              }}
            >
              {t('সব অফিস দেখুন', 'Show all offices')}
            </button>
          </div>
        )}
        <SourceCards kind="OFFICE" officeId={linkedOfficeId} title={t('অফিস ও সিটিজেন চার্টারের হালনাগাদ','Reviewed official updates')} />
        {/* Banner */}
        <div className="bg-[#006A4E] text-white rounded-2xl p-6 sm:p-8 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-100 text-xs font-semibold">
            <Building2 className="w-4 h-4 text-emerald-300" />
            <span>{t('সার্ভিস পয়েন্ট ও দপ্তর অনুসন্ধান', 'Office Directory & Service Points')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t('নিকটস্থ ভূমি, সাব-রেজিস্ট্রি ও ইউনিয়ন সেবা কেন্দ্র', 'Nearby Land, Sub-Registry & Union Service Points')}
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-3xl leading-relaxed">
            {t(
              'ঢাকা, গাজীপুর ও কুমিল্লা জেলাসহ বাংলাদেশের বিভিন্ন সাব-রেজিস্ট্রি অফিস, সহকারী কমিশনার (ভূমি) কার্যালয়, জোনাল সেটেলমেন্ট অফিস এবং ইউনিয়ন ডিজিটাল সেন্টার সেবা কেন্দ্রের সম্পূর্ণ তালিকা, অধিক্ষেত্র ও সেবা নির্দেশিকা।',
              'Official nationwide directory of sub-registry offices, upazila land offices, zonal settlement offices, and union digital service points with jurisdiction details.'
            )}
          </p>
        </div>

        {/* F18: Inline map-unavailable notice (replaces alert()). */}
        {mapNotice && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" />
              <p className="text-sm font-semibold">{mapNotice}</p>
            </div>
            <button
              type="button"
              onClick={() => setMapNotice(null)}
              className="text-amber-700 hover:text-amber-900 text-sm font-bold px-2"
              aria-label="Dismiss notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('দপ্তর, জেলা, উপজেলা বা মৌজা...', 'Search by office, district, mouza...')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            />
          </div>

          <div>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setUpazilaFilter('');
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল জেলা', 'All Districts')}</option>
              <option value="ঢাকা">{t('ঢাকা', 'Dhaka')}</option>
              <option value="গাজীপুর">{t('গাজীপুর', 'Gazipur')}</option>
              <option value="কুমিল্লা">{t('কুমিল্লা', 'Cumilla')}</option>
              <option value="নারায়ণগঞ্জ">{t('নারায়ণগঞ্জ', 'Narayanganj')}</option>
            </select>
          </div>

          <div>
            <select
              value={upazilaFilter}
              onChange={(e) => setUpazilaFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল উপজেলা', 'All Upazilas')}</option>
              {(!districtFilter || districtFilter === 'ঢাকা') && <option value="সাভার">{t('সাভার (ঢাকা)', 'Savar (Dhaka)')}</option>}
              {(!districtFilter || districtFilter === 'ঢাকা') && <option value="তেজগাঁও">{t('তেজগাঁও (ঢাকা)', 'Tejgaon (Dhaka)')}</option>}
              {(!districtFilter || districtFilter === 'গাজীপুর') && <option value="গাজীপুর সদর">{t('গাজীপুর সদর', 'Gazipur Sadar')}</option>}
              {(!districtFilter || districtFilter === 'কুমিল্লা') && <option value="দাউদকান্দি">{t('দাউদকান্দি (কুমিল্লা)', 'Daudkandi (Cumilla)')}</option>}
              {(!districtFilter || districtFilter === 'কুমিল্লা') && <option value="কুমিল্লা আদর্শ সদর">{t('কুমিল্লা আদর্শ সদর', 'Cumilla Adarsha Sadar')}</option>}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল প্রকার দপ্তর', 'All Office Types')}</option>
              <option value="registry">{t('সাব-রেজিস্ট্রি অফিস', 'Sub-Registry')}</option>
              <option value="ac_land">{t('উপজেলা ভূমি অফিস', 'Upazila Land Office')}</option>
              <option value="settlement">{t('জোনাল সেটেলমেন্ট অফিস', 'Zonal Settlement')}</option>
              <option value="service_point">{t('ইউনিয়ন সার্ভিস পয়েন্ট', 'UDC Service Point')}</option>
              <option value="bank_branch">{t('ব্যাংক শাখা', 'Bank Branch')}</option>
              <option value="admin_cell">{t('জেলা প্রশাসন ও সেল', 'District Admin / Cell')}</option>
            </select>
          </div>
        </div>

        {/* Offices Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#006A4E] mb-3" />
            <p className="font-semibold">{t('দপ্তরের তালিকা লোড হচ্ছে...', 'Loading offices...')}</p>
          </div>
        ) : filteredOffices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-amber-200 p-10 text-center text-slate-600 space-y-4 shadow-xs">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building2 className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-slate-900">
                {t('এই অঞ্চলে কোনো সরকারি কার্যালয় অনবোর্ড করা হয়নি (Coverage Gap)', 'No Onboarded Office for this Jurisdiction')}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(
                  'অনুসন্ধানকৃত এলাকা বা ফিল্টারের অধীনে কোনো সক্রিয় দপ্তর নিবন্ধিত নেই। নতুন এলাকা অনবোর্ডিং প্রক্রিয়াধীন রয়েছে। জরুরি ভূমি সেবা বা তথ্য অনুসন্ধানের জন্য সরাসরি ১৬১২২ হেল্পলাইনে যোগাযোগ করুন।',
                  'No active office registered under this jurisdiction. Coverage expansion is in progress. For emergency land services, call 16122.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDistrictFilter('');
                  setUpazilaFilter('');
                  setTypeFilter('');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {t('ফিল্টার রিসেট করুন', 'Reset Filters')}
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('tickets?new=1')}
                  className="px-4 py-2 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition cursor-pointer"
                >
                  {t('নতুন অঞ্চল অনবোর্ডিং আবেদন', 'Request Jurisdiction Onboarding')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredOffices.map((off) => {
              const badge = getOfficeTypeBadge(off.office_type);
              let mouzasServed: string[] = [];
              try {
                mouzasServed = JSON.parse(off.mouzas_served_json || '[]');
              } catch {
                mouzasServed = [];
              }

              return (
                <div
                  key={off.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} mb-2`}
                        >
                          {lang === 'bn' ? badge.labelBn : badge.labelEn}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">
                          {lang === 'bn' ? off.name_bn : off.name_en}
                        </h3>
                        <p className="text-xs font-mono text-slate-500">{off.office_code}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{lang === 'bn' ? off.address_bn : off.address_en}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {t('যোগাযোগ:', 'Contact:')} <strong className="text-slate-800">{off.contact_phone}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{t('কার্যকাল: রবিবার - বৃহস্পতিবার, সকাল ৯টা - বিকাল ৪টা', 'Sun - Thu, 9:00 AM - 4:00 PM')}</span>
                      </div>
                    </div>

                    {mouzasServed.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-600 block mb-1">
                          {t('আওতাধীন মৌজাসমূহ:', 'Jurisdiction Mouzas:')}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {mouzasServed.map((m, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700 font-medium"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewOnMap(off)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer min-h-[40px]"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t('ম্যাপে অবস্থান', 'View on Map')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBookingOffice(off);
                        setBookingSuccess(false);
                        setBookingResult(null);
                        setBookingError('');
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#006A4E] hover:bg-emerald-800 transition cursor-pointer min-h-[40px]"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{t('সরাসরি সাক্ষাতের বুকিং', 'Book Appointment')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Appointment Booking Modal */}
        {bookingOffice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#006A4E]" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-tight">
                      {t('স্থানীয় সেবা অ্যাপয়েন্টমেন্ট অনুরোধ', 'Local Service Appointment Request')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {t('দপ্তরের কাজের চাপ ও সময়সূচী সাপেক্ষে সেবা অনুরোধ', 'Subject to office schedule & capacity confirmation')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBookingOffice(null);
                    setBookingSuccess(false);
                    setBookingResult(null);
                    setBookingError('');
                  }}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {bookingSuccess && bookingResult ? (
                <div className="p-6 text-center space-y-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-10 h-10 text-[#006A4E] mx-auto animate-bounce" />
                  <p className="font-bold text-emerald-950 text-base">
                    {t('✔ আপনার অ্যাপয়েন্টমেন্ট অনুরোধ সফলভাবে গৃহীত হয়েছে!', '✔ Appointment request submitted successfully!')}
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 text-left space-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-500">{t('ট্র্যাকিং কোড:', 'Tracking Code:')}</span>{' '}
                      <span className="font-mono font-bold text-[#006A4E]">{bookingResult.appointment_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('অনুরোধকৃত তারিখ ও সময়:', 'Requested Date & Time:')}</span>{' '}
                      <span className="font-semibold">{bookingResult.slot_date} ({bookingResult.slot_time})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('সেবার ধরণ:', 'Service:')}</span>{' '}
                      <span className="font-semibold">{bookingResult.service_type}</span>
                    </div>
                    <div className="pt-1 border-t border-slate-100 text-[11px] text-amber-800">
                      <span>• {t('স্ট্যাটাস: স্থানীয় অনুরোধ অপেক্ষমাণ (দপ্তরের অনুমোদন সাপেক্ষে)', 'Status: Local Request Pending Confirmation')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-800">
                    {t('নির্ধারিত তারিখে প্রয়োজনীয় মূল কাগজপত্রসহ উপস্থিত হোন। ট্র্যাকিং কোডটি সংরক্ষণ করুন।', 'Please bring your original NID and documents on the selected date. Save your tracking code.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBookingOffice(null);
                      setBookingSuccess(false);
                      setBookingResult(null);
                      setAppointmentName('');
                      setAppointmentPhone('');
                      setAppointmentDate('');
                      setAppointmentCaseRef('');
                    }}
                    className="mt-3 w-full py-2.5 bg-[#006A4E] text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition cursor-pointer min-h-[40px]"
                  >
                    {t('সম্পন্ন', 'Done')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-3.5">
                  {bookingError && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                      {bookingError}
                    </div>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                    <p>
                      <strong>{t('নির্বাচিত দপ্তর:', 'Office:')}</strong>{' '}
                      {lang === 'bn' ? bookingOffice.name_bn : bookingOffice.name_en}
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      {lang === 'bn' ? bookingOffice.address_bn : bookingOffice.address_en}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('আপনার নাম', 'Your Full Name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={appointmentName}
                      onChange={(e) => setAppointmentName(e.target.value)}
                      placeholder={t('উদা: মো. রফিকুল ইসলাম', 'e.g. Md. Rafiqul Islam')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('মোবাইল নম্বর', 'Mobile Number')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={appointmentPhone}
                      onChange={(e) => setAppointmentPhone(e.target.value)}
                      placeholder="01700-001001"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('পছন্দের তারিখ', 'Preferred Date')} *
                      </label>
                      <input
                        type="date"
                        required
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('পছন্দের সময় স্লট', 'Time Slot')} *
                      </label>
                      <select
                        value={appointmentTimeSlot}
                        onChange={(e) => setAppointmentTimeSlot(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                      >
                        <option value="10:00 AM - 11:30 AM">{t('সকাল ১০:০০ - ১১:৩০', 'Morning 10:00 - 11:30 AM')}</option>
                        <option value="11:30 AM - 01:00 PM">{t('দুপুর ১১:৩০ - ০১:০০', 'Noon 11:30 AM - 01:00 PM')}</option>
                        <option value="02:00 PM - 03:30 PM">{t('দুপুর ০২:০০ - ০৩:৩০', 'Afternoon 02:00 - 03:30 PM')}</option>
                        <option value="03:30 PM - 05:00 PM">{t('বিকাল ০৩:৩০ - ০৫:০০', 'Late Afternoon 03:30 - 05:00 PM')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('সেবার ধরণ', 'Service Category')} *
                    </label>
                    <select
                      value={appointmentServiceType}
                      onChange={(e) => setAppointmentServiceType(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                    >
                      <option value="GENERAL_INQUIRY">{t('সাধারণ নাগরিক পরামর্শ ও তথ্য অনুসন্ধান', 'General Inquiry & Advisory')}</option>
                      <option value="MUTATION_HEARING">{t('ই-নামজারি শুনানী তথ্য ও কাগজপত্র জমা', 'Mutation Hearing & Record Submission')}</option>
                      <option value="DEED_REGISTRATION">{t('দলিল রেজিস্ট্রি প্রস্তুতি ও ফি যাচাই', 'Deed Registry Preparation & Fee Check')}</option>
                      <option value="RECORD_VERIFICATION">{t('খতিয়ান/পর্চা রেকর্ড শুদ্ধিকরণ পরামর্শ', 'Khatian/Porcha Correction Advisory')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('আবেদন বা মামলা রেফারেন্স (ঐচ্ছিক)', 'Application / Case Ref (Optional)')}
                    </label>
                    <input
                      type="text"
                      value={appointmentCaseRef}
                      onChange={(e) => setAppointmentCaseRef(e.target.value)}
                      placeholder={t('উদা: MUT-2026-0042', 'e.g. MUT-2026-0042')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBookingOffice(null)}
                      disabled={bookingLoading}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[40px]"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer min-h-[40px]"
                    >
                      {bookingLoading ? t('অনুরোধ দাখিল হচ্ছে...', 'Submitting Request...') : t('অ্যাপয়েন্টমেন্ট অনুরোধ পাঠান', 'Send Appointment Request')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
