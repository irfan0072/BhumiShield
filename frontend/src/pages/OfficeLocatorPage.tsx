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
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Appointment Modal
  const [bookingOffice, setBookingOffice] = useState<OfficeItem | null>(null);
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentPhone, setAppointmentPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingResult, setBookingResult] = useState<any | null>(null);

  const fetchOffices = () => {
    setLoading(true);
    const params: any = {};
    if (typeFilter) params.type = typeFilter;
    if (upazilaFilter) params.upazila = upazilaFilter;

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
  }, [typeFilter, upazilaFilter]);

  const getOfficeTypeBadge = (type: string) => {
    switch (type) {
      case 'registry':
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
      case 'service_point':
        return {
          labelBn: 'ইউনিয়ন ডিজিটাল সেন্টার (সার্ভিস পয়েন্ট)',
          labelEn: 'UDC Service Point',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'bank_branch':
        return {
          labelBn: 'তফসিলি ব্যাংক শাখা',
          labelEn: 'Bank Branch',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
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
      item.name_bn.toLowerCase().includes(q) || item.name_en.toLowerCase().includes(q);
    const codeMatch = item.office_code.toLowerCase().includes(q);
    const upazilaMatch =
      item.upazila_bn.toLowerCase().includes(q) || item.upazila_en.toLowerCase().includes(q);
    return nameMatch || codeMatch || upazilaMatch;
  });

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingOffice) return;
    setBookingLoading(true);
    setBookingError('');
    try {
      const res = await BhumiApi.createAppointment({
        office_id: bookingOffice.id,
        citizen_name_bn: appointmentName,
        citizen_phone: appointmentPhone,
        slot_date: appointmentDate,
        service_type: 'GENERAL_INQUIRY',
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
      alert(t('এই দপ্তরের জিপিএস মানচিত্র স্থানাঙ্ক বর্তমানে হালনাগাদ করা হচ্ছে।', 'GPS coordinates for this office are currently being surveyed.'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
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
              'সাভার, ঢাকা এবং গাজীপুরের সাব-রেজিস্ট্রি অফিস, সহকারী কমিশনার (ভূমি) কার্যালয়, ইউনিয়ন ডিজিটাল সেন্টারের সার্ভিস পয়েন্ট এবং বন্ধকী ঋণ অনাপত্তিপত্র প্রদানকারী অনুমোদিত ব্যাংক শাখাগুলির সম্পূর্ণ তালিকা ও সময়সূচী।',
              'Official directory of sub-registry offices, upazila land offices, union digital service points, and authorized bank branches with contact details and jurisdictional mouzas.'
            )}
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('দপ্তর বা উপজেলার নাম...', 'Search by office or upazila...')}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            />
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
              <option value="service_point">{t('ইউনিয়ন সার্ভিস পয়েন্ট', 'UDC Service Point')}</option>
              <option value="bank_branch">{t('ব্যাংক শাখা', 'Bank Branch')}</option>
            </select>
          </div>

          <div>
            <select
              value={upazilaFilter}
              onChange={(e) => setUpazilaFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল উপজেলা', 'All Upazilas')}</option>
              <option value="সাভার">{t('সাভার', 'Savar')}</option>
              <option value="গাজীপুর সদর">{t('গাজীপুর সদর', 'Gazipur Sadar')}</option>
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
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">
              {t('কোনো দপ্তর খুঁজে পাওয়া যায়নি।', 'No offices matched your filter criteria.')}
            </p>
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
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('দপ্তরে উপস্থিতির অ্যাপয়েন্টমেন্ট', 'Schedule In-Person Appointment')}
                  </h3>
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
                    {t('✔ আপনার অ্যাপয়েন্টমেন্ট সফলভাবে নিবন্ধিত হয়েছে!', '✔ Appointment booked successfully!')}
                  </p>
                  <div className="bg-white p-3 rounded-lg border border-emerald-200 text-left space-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">{t('ট্র্যাকিং কোড:', 'Tracking Code:')}</span>{' '}
                      <span className="font-mono font-bold text-[#006A4E]">{bookingResult.appointment_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('তারিখ ও সময়:', 'Date & Time:')}</span>{' '}
                      <span className="font-semibold">{bookingResult.slot_date} ({bookingResult.slot_time})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('সেবার ধরণ:', 'Service:')}</span>{' '}
                      <span className="font-semibold">{bookingResult.service_type}</span>
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
                    }}
                    className="mt-3 w-full py-2.5 bg-[#006A4E] text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition cursor-pointer min-h-[40px]"
                  >
                    {t('সম্পন্ন', 'Done')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-4">
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
                    <p className="text-slate-500 mt-1">
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
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
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
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('তারিখ নির্বাচন করুন', 'Select Preferred Date')} *
                    </label>
                    <input
                      type="date"
                      required
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBookingOffice(null)}
                      disabled={bookingLoading}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[44px]"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition cursor-pointer min-h-[44px]"
                    >
                      {bookingLoading ? t('বুকিং হচ্ছে...', 'Booking...') : t('বুকিং নিশ্চিত করুন', 'Confirm Booking')}
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
