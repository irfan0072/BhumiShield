import React, { useState, useEffect } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Send,
  Eye,
  MapPin,
  X,
  AlertTriangle,
  FileCheck,
  Tag,
  Lock,
  PhoneCall,
  ChevronRight,
  Info
} from 'lucide-react';

interface ListingItem {
  id: number;
  listing_code: string;
  plot_id: number;
  plot_code: string;
  dag_no: string;
  dag_no_bn: string;
  land_type_bn: string;
  land_type_en: string;
  district_bn: string;
  district_en: string;
  upazila_bn: string;
  upazila_en: string;
  mouza_bn: string;
  mouza_en: string;
  asking_price_bdt: number;
  area_decimal: number;
  description_bn: string;
  description_en: string;
  verification_badge: string;
  co_owner_consent_confirmed: number;
  seller_nid_masked: string;
  created_at: string;
}

interface PublicSalePageProps {
  onNavigate?: (tab: string) => void;
}

export const PublicSalePage: React.FC<PublicSalePageProps> = ({ onNavigate }) => {
  const { t, lang, formatNumber } = useAppUI();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [disclaimerBn, setDisclaimerBn] = useState('');
  const [disclaimerEn, setDisclaimerEn] = useState('');

  // Filters
  const [districtFilter, setDistrictFilter] = useState('');
  const [upazilaFilter, setUpazilaFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Enquiry Modal
  const [enquiryListing, setEnquiryListing] = useState<ListingItem | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerNid, setBuyerNid] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);

  // Listing Details Modal
  const [selectedListingDetail, setSelectedListingDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchListings = () => {
    setLoading(true);
    const params: any = {};
    if (districtFilter) params.district = districtFilter;
    if (upazilaFilter) params.upazila = upazilaFilter;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    BhumiApi.listListings(params)
      .then((res) => {
        setListings(res.items || []);
        setDisclaimerBn(res.disclaimer_bn || '');
        setDisclaimerEn(res.disclaimer_en || '');
      })
      .catch((err) => {
        console.error('Failed to load listings', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchListings();
  }, [districtFilter, upazilaFilter]);

  const handleOpenDetail = (listing: ListingItem) => {
    setDetailLoading(true);
    setSelectedListingDetail(null);
    BhumiApi.getListing(listing.listing_code || listing.id)
      .then((res) => {
        setSelectedListingDetail(res);
      })
      .catch((err) => {
        console.error('Failed to get listing detail', err);
      })
      .finally(() => setDetailLoading(false));
  };

  const handleSendEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryListing) return;

    setEnquirySubmitting(true);
    BhumiApi.createListingEnquiry(enquiryListing.listing_code || enquiryListing.id, {
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_nid: buyerNid,
      message_bn: enquiryMessage,
    })
      .then((res) => {
        setEnquirySuccess(lang === 'bn' ? res.message_bn : res.message_en);
        setTimeout(() => {
          setEnquiryListing(null);
          setEnquirySuccess(null);
          setBuyerName('');
          setBuyerPhone('');
          setBuyerNid('');
          setEnquiryMessage('');
        }, 2200);
      })
      .catch((err) => {
        alert(err.response?.data?.message_bn || 'আগ্রহ প্রেরণ ব্যর্থ হয়েছে।');
      })
      .finally(() => setEnquirySubmitting(false));
  };

  const filteredListings = listings.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const dagMatch = item.dag_no.includes(q) || item.dag_no_bn.includes(q);
    const codeMatch = item.listing_code.toLowerCase().includes(q) || item.plot_code.toLowerCase().includes(q);
    const mouzaMatch =
      item.mouza_bn.toLowerCase().includes(q) || item.mouza_en.toLowerCase().includes(q);
    return dagMatch || codeMatch || mouzaMatch;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-[#006A4E] text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/60 border border-emerald-600/40 text-emerald-100 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>{t('নিষ্কণ্টক ও যাচাইকৃত জমির হাট', 'Verified & Safe Land Marketplace')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('সুরক্ষিত নাগরিক জমি বিক্রয় প্ল্যাটফর্ম', 'Secure Citizen Land Sale Marketplace')}
            </h1>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
              {t(
                'কেবলমাত্র নিষ্কণ্টক, বন্ধকমুক্ত, বিক্রয়-লক মুক্ত এবং সহকারী কমিশনার (ভূমি) দ্বারা অনুমোদিত সর্বশেষ খতিয়ানের বৈধ মালিকদের জমি এখানে তালিকাভুক্ত হয়। কোনো দালাল বা মধ্যস্বত্বভোগী নেই।',
                'Only unencumbered, mortgage-free, unlocked properties with verified ownership records confirmed by AC Land are listed here. Direct citizen-to-citizen connection without unauthorized middlemen.'
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate?.('check')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-white text-[#006A4E] hover:bg-emerald-50 rounded-xl font-bold text-sm shadow-sm transition-colors cursor-pointer min-h-[48px]"
            >
              <Search className="w-4 h-4" />
              <span>{t('অন্য জমি যাচাই করুন', 'Verify Any Land')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('map')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm border border-emerald-600/50 shadow-sm transition-colors cursor-pointer min-h-[48px]"
            >
              <MapPin className="w-4 h-4" />
              <span>{t('ম্যাপে দেখুন', 'Explore on Map')}</span>
            </button>
          </div>
        </div>

        {/* Disclaimer Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
            <strong>{t('আইনি নোটিশ:', 'Legal Notice:')}</strong>{' '}
            {lang === 'bn' ? disclaimerBn : disclaimerEn || disclaimerBn}
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('অনুসন্ধান (দাগ বা মৌজা)', 'Search (Dag or Mouza)')}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('উদা: ১০১ বা বিরুলিয়া', 'e.g. 101 or Birulia')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] focus:border-transparent outline-none min-h-[40px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('জেলা', 'District')}
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল জেলা', 'All Districts')}</option>
              <option value="ঢাকা">{t('ঢাকা', 'Dhaka')}</option>
              <option value="গাজীপুর">{t('গাজীপুর', 'Gazipur')}</option>
              <option value="নারায়ণগঞ্জ">{t('নারায়ণগঞ্জ', 'Narayanganj')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('উপজেলা', 'Upazila')}
            </label>
            <select
              value={upazilaFilter}
              onChange={(e) => setUpazilaFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            >
              <option value="">{t('সকল উপজেলা', 'All Upazilas')}</option>
              <option value="সাভার">{t('সাভার', 'Savar')}</option>
              <option value="গাজীপুর সদর">{t('গাজীপুর সদর', 'Gazipur Sadar')}</option>
              <option value="সোনারগাঁও">{t('সোনারগাঁও', 'Sonargaon')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('সর্বনিম্ন মূল্য (টাকা)', 'Min Price (BDT)')}
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="1000000"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('সর্বোচ্চ মূল্য (টাকা)', 'Max Price (BDT)')}
              </label>
              <input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="5000000"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[40px]"
              />
            </div>
            <button
              type="button"
              onClick={fetchListings}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition cursor-pointer min-h-[40px]"
            >
              <Filter className="w-4 h-4 inline mr-1" />
              {t('ফিল্টার', 'Filter')}
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-[#006A4E] mb-3" />
            <p className="font-semibold">{t('বিজ্ঞাপনসমূহ লোড হচ্ছে...', 'Loading land listings...')}</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
            <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-800">
              {t('চিহ্নিত শর্তে কোনো বিক্রির বিজ্ঞাপন পাওয়া যায়নি।', 'No land listings matched your criteria.')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {t('ফিল্টার রিসেট করে পুনরায় চেষ্টা করুন।', 'Try resetting filters or searching a different mouza.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="p-5 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 border border-emerald-200 text-[#006A4E] mb-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t('নিষ্কণ্টক মালিকানা', 'Verified Clear')}</span>
                      </div>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                        {t('দাগ নং:', 'Plot Dag:')} {lang === 'bn' ? item.dag_no_bn : item.dag_no}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{item.listing_code}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">{t('জমির পরিমাণ', 'Land Area')}</span>
                      <span className="text-base font-bold text-slate-800">
                        {formatNumber(item.area_decimal)} {t('শতক', 'Decimal')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {lang === 'bn'
                          ? `${item.mouza_bn} মৌজা, ${item.upazila_bn}, ${item.district_bn}`
                          : `${item.mouza_en} Mouza, ${item.upazila_en}, ${item.district_en}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {t('জমির শ্রেণী:', 'Land Class:')}{' '}
                        <strong>{lang === 'bn' ? item.land_type_bn : item.land_type_en}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {lang === 'bn' ? item.description_bn : item.description_en}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {t('বিক্রেতা NID:', 'Seller NID:')}{' '}
                        <code className="font-mono font-semibold text-slate-700">
                          {item.seller_nid_masked}
                        </code>
                      </span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        {t('বিক্রয় লক নিষ্ক্রিয়', 'Unlocked')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-5 pt-3 bg-slate-50/70 border-t border-slate-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-slate-500">{t('চাওয়া মূল্য', 'Asking Price')}</span>
                    <span className="text-xl font-extrabold text-[#006A4E]">
                      ৳ {formatNumber(item.asking_price_bdt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(item)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition cursor-pointer min-h-[44px]"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('বিস্তারিত ও ভল্ট', 'Details & Vault')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnquiryListing(item)}
                      className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#006A4E] hover:bg-emerald-800 transition cursor-pointer min-h-[44px]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('আগ্রহ প্রকাশ', 'Inquire')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* In-App Enquiry Modal */}
        {enquiryListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#006A4E]" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('জমির প্রতি আগ্রহ প্রকাশ করুন', 'Express Buyer Interest')}
                  </h3>
                </div>
                <button
                  onClick={() => setEnquiryListing(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {enquirySuccess ? (
                <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-[#006A4E] mx-auto animate-bounce" />
                  <p className="font-bold text-emerald-950 text-sm">{enquirySuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleSendEnquiry} className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p>
                      <strong>{t('বিজ্ঞাপন কোড:', 'Listing Code:')}</strong> {enquiryListing.listing_code}
                    </p>
                    <p>
                      <strong>{t('দাগ ও এলাকা:', 'Dag & Area:')}</strong> দাগ{' '}
                      {lang === 'bn' ? enquiryListing.dag_no_bn : enquiryListing.dag_no},{' '}
                      {enquiryListing.mouza_bn} মৌজা
                    </p>
                    <p>
                      <strong>{t('মূল্য:', 'Price:')}</strong> ৳{' '}
                      {formatNumber(enquiryListing.asking_price_bdt)} ({formatNumber(enquiryListing.area_decimal)} শতক)
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('আপনার নাম', 'Your Full Name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      placeholder={t('উদা: মো. আরিফুল হক', 'e.g. Md. Ariful Haque')}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('মোবাইল নম্বর (১১ ডিজিট)', 'Mobile Number (11 digits)')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        placeholder="01700-009999"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('জাতীয় পরিচয়পত্র (NID)', 'NID Number')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={buyerNid}
                        onChange={(e) => setBuyerNid(e.target.value)}
                        placeholder="9900009999"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('আপনার বার্তা বা প্রস্তাব', 'Message or Offer')}
                    </label>
                    <textarea
                      rows={3}
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      placeholder={t(
                        'আমি এই দাগের জমিটি পরিদর্শন ও আনুষ্ঠানিক যাচাইয়ের মাধ্যমে ক্রয়ে আগ্রহী...',
                        'I am interested in inspecting and purchasing this verified plot...'
                      )}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#006A4E] outline-none"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-tight">
                    {t(
                      '🔒 গোপনীয়তা সুরক্ষা: আপনার ব্যক্তিগত ফোন নম্বর পাবলিক নয়। বিক্রেতা আবেদন গ্রহণ করলে যৌথভাবে হস্তান্তর উইজার্ডে সংযোগ হবে।',
                      '🔒 Privacy Safeguard: Your contact phone is masked. Direct secure transaction happens only through the official Sub-Registry transfer wizard.'
                    )}
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEnquiryListing(null)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer min-h-[44px]"
                    >
                      {t('বাতিল', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={enquirySubmitting}
                      className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      {enquirySubmitting ? (
                        <span>{t('প্রেরণ হচ্ছে...', 'Sending...')}</span>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>{t('আগ্রহ প্রেরণ করুন', 'Submit Enquiry')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Listing Details & Vault Summary Modal */}
        {selectedListingDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#006A4E]" />
                  <h3 className="font-bold text-slate-900 text-base">
                    {t('জমির পূর্ণ বিবরণ ও ভল্ট স্ট্যাটাস', 'Plot Profile & Vault Status')}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedListingDetail(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">{t('বিজ্ঞাপন কোড', 'Listing Code')}</span>
                    <strong className="text-sm font-mono text-slate-800">
                      {selectedListingDetail.listing.listing_code}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('দাগ কোড', 'Plot Code')}</span>
                    <strong className="text-sm font-mono text-slate-800">
                      {selectedListingDetail.plot.plot_code}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('দাগ নং ও শ্রেণী', 'Dag & Class')}</span>
                    <strong className="text-sm text-slate-800">
                      দাগ {selectedListingDetail.plot.dag_no} (
                      {selectedListingDetail.plot.land_type_bn})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">{t('চাওয়া মূল্য', 'Asking Price')}</span>
                    <strong className="text-base text-[#006A4E]">
                      ৳ {formatNumber(selectedListingDetail.listing.asking_price_bdt)}
                    </strong>
                  </div>
                </div>

                {/* Vault Verification Summary */}
                <div className="border border-emerald-200 bg-emerald-50/60 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
                    {t('নাগরিক ভল্ট ও নথিপত্র সারসংক্ষেপ', 'Citizen Document Vault Summary')}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">{t('মোট দলিল/পর্চা', 'Total Docs')}</span>
                      <strong className="text-sm text-slate-800">
                        {selectedListingDetail.documents_summary.total_documents} টি
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">{t('যাচাইকৃত (L2/L3)', 'Verified (L2/L3)')}</span>
                      <strong className="text-sm text-[#006A4E]">
                        {selectedListingDetail.documents_summary.verified_documents} টি
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-slate-500 block text-[11px]">{t('বিএস খতিয়ান', 'BS Khatian')}</span>
                      <strong className="text-sm text-emerald-700">✓ সংরক্ষিত</strong>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h5 className="text-xs font-bold text-slate-700 mb-1">{t('বিস্তারিত বর্ণনা', 'Detailed Description')}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {lang === 'bn'
                      ? selectedListingDetail.listing.description_bn
                      : selectedListingDetail.listing.description_en}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedListingDetail(null);
                      onNavigate?.(`check?plot_id=${selectedListingDetail.plot.id}`);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Search className="w-4 h-4" />
                    <span>{t('এই দাগের পূর্ণ ঝুঁকি রিপোর্ট যাচাই', 'Run Full Fraud Pre-Check')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const l = {
                        ...selectedListingDetail.listing,
                        dag_no: selectedListingDetail.plot?.dag_no || selectedListingDetail.listing?.dag_no,
                        dag_no_bn: selectedListingDetail.plot?.dag_no_bn || selectedListingDetail.listing?.dag_no_bn,
                        mouza_bn: selectedListingDetail.plot?.mouza_bn || selectedListingDetail.listing?.mouza_bn,
                        mouza_en: selectedListingDetail.plot?.mouza_en || selectedListingDetail.listing?.mouza_en,
                        upazila_bn: selectedListingDetail.plot?.upazila_bn || selectedListingDetail.listing?.upazila_bn,
                        upazila_en: selectedListingDetail.plot?.upazila_en || selectedListingDetail.listing?.upazila_en,
                        district_bn: selectedListingDetail.plot?.district_bn || selectedListingDetail.listing?.district_bn,
                        district_en: selectedListingDetail.plot?.district_en || selectedListingDetail.listing?.district_en,
                      };
                      setSelectedListingDetail(null);
                      setEnquiryListing(l);
                    }}
                    className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('আগ্রহ প্রকাশ করুন', 'Express Interest')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
