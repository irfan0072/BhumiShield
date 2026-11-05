import React, { useState } from 'react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
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
  Clock,
  FileCheck,
  Tag,
  Lock,
  PhoneCall,
  ChevronRight,
  Info,
  RotateCcw,
  Sparkles,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useListings } from '../components/publicHooks';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface ListingItem {
  id: number;
  listing_code: string;
  plot_id: number;
  plot_code: string;
  dag_no: string;
  dag_no_bn: string;
  land_type_bn: string;
  land_type_en: string;
  division_bn?: string;
  division_en?: string;
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

export const PublicSalePage: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { t, lang } = useAppUI();

  // Filters State
  const [divisionFilter, setDivisionFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [landTypeFilter, setLandTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Dynamic Hierarchy Queries from Real Backend API
  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ['hierarchyDivisions'],
    queryFn: () => BhumiApi.getHierarchyDivisions(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: districts = [] } = useQuery<any[]>({
    queryKey: ['hierarchyDistricts', divisionFilter],
    queryFn: () => BhumiApi.getHierarchyDistricts(divisionFilter),
    enabled: Boolean(divisionFilter),
    staleTime: 10 * 60 * 1000,
  });

  // TanStack Query for Dynamic Listings
  const queryFilters = {
    district: districtFilter || undefined,
    min_price: minPrice || undefined,
    max_price: maxPrice || undefined,
  };
  const listingsQuery = useListings(queryFilters);

  // Listing Details Modal State
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);

  // Enquiry Dialog State
  const [enquiryListing, setEnquiryListing] = useState<ListingItem | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerNid, setBuyerNid] = useState('');
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);
  const [enquirySuccessMsg, setEnquirySuccessMsg] = useState<string | null>(null);
  const [enquiryErrorMsg, setEnquiryErrorMsg] = useState<string | null>(null);

  const rawListings: ListingItem[] = listingsQuery.data?.items || [];

  // Client filter for division, land type, and text query (mouza / dag / code)
  const filteredListings = rawListings.filter((l) => {
    if (landTypeFilter && l.land_type_bn !== landTypeFilter && l.land_type_en !== landTypeFilter) {
      return false;
    }
    if (divisionFilter) {
      const matchDivision =
        (l.division_bn || '').toLowerCase().includes(divisionFilter.toLowerCase()) ||
        (l.division_en || '').toLowerCase().includes(divisionFilter.toLowerCase());
      if (!matchDivision) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (l.mouza_bn || '').toLowerCase().includes(q) ||
      (l.mouza_en || '').toLowerCase().includes(q) ||
      (l.dag_no || '').includes(q) ||
      (l.dag_no_bn || '').includes(q) ||
      (l.listing_code || '').toLowerCase().includes(q)
    );
  });

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryListing || !buyerName.trim() || !buyerPhone.trim()) return;
    setSubmittingEnquiry(true);
    setEnquiryErrorMsg(null);

    try {
      await BhumiApi.createListingEnquiry(enquiryListing.id, {
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim(),
        buyer_nid: buyerNid.trim(),
        message: enquiryMessage.trim() || 'আমি এই জমিটি ক্রয় করতে আগ্রহী।',
      });
      setEnquirySuccessMsg(
        t(
          'আপনার ক্রয় প্রস্তাব বিক্রেতার কাছে সফলভাবে পাঠানো হয়েছে। বিক্রেতা শীঘ্রই আপনার সাথে যোগাযোগ করবেন।',
          'Your purchase enquiry has been sent to the verified owner.'
        )
      );
      setBuyerName('');
      setBuyerPhone('');
      setBuyerNid('');
      setEnquiryMessage('');
    } catch {
      setEnquiryErrorMsg(
        t(
          'প্রস্তাব পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে ফোন নম্বর পরীক্ষা করে পুনরায় চেষ্টা করুন।',
          'Failed to send enquiry. Please check your contact details and retry.'
        )
      );
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  const handleResetFilters = () => {
    setDivisionFilter('');
    setDistrictFilter('');
    setLandTypeFilter('');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
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
            <ShieldCheck className="w-4 h-4 text-[#006A4E]" />
            <span>{t('যাচাইকৃত জমি মার্কেটপ্লেস', 'Verified Land Marketplace')}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-snug">
            {t('জমি ক্রয়-বিক্রয় মার্কেটপ্লেস', 'Land Marketplace')}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            {t(
              'যাচাইকৃত জমি ও নাগরিক-টু-নাগরিক সরাসরি লেনদেন।',
              'Verified land listings and direct citizen-to-citizen transactions.'
            )}
          </p>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 space-y-6">
        {/* Search & Filter Controls Card */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#006A4E]" />
              <h2 className="text-sm font-bold text-slate-800">
                {t('ফিল্টার ও অনুসন্ধান', 'Search & Filter Listings')}
              </h2>
            </div>
            {(divisionFilter || districtFilter || landTypeFilter || searchQuery || minPrice || maxPrice) && (
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Division Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#006A4E]" />
                <span>{t('বিভাগ', 'Division')}</span>
              </Label>
              <Select
                value={divisionFilter || 'ALL'}
                onValueChange={(val) => {
                  setDivisionFilter(val === 'ALL' ? '' : val);
                  setDistrictFilter('');
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল বিভাগ', 'All Divisions')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল বিভাগ', 'All Divisions')}</SelectItem>
                    {divisions.map((d: any, idx: number) => {
                      const val = String(typeof d === 'string' ? d : d.division_bn || d.name_bn || d.name_en || d.id || idx);
                      const label = typeof d === 'string' ? d : lang === 'bn' ? d.division_bn || d.name_bn : d.division_en || d.name_en || d.name_bn;
                      return (
                        <SelectItem key={idx} value={val}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* District Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#006A4E]" />
                <span>{t('জেলা', 'District')}</span>
              </Label>
              <Select
                value={districtFilter || 'ALL'}
                onValueChange={(val) => setDistrictFilter(val === 'ALL' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল জেলা', 'All Districts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল জেলা', 'All Districts')}</SelectItem>
                    {districts.map((d: any, idx: number) => {
                      const val = String(typeof d === 'string' ? d : d.district_bn || d.name_bn || d.name_en || d.id || idx);
                      const label = typeof d === 'string' ? d : lang === 'bn' ? d.district_bn || d.name_bn : d.district_en || d.name_en || d.name_bn;
                      return (
                        <SelectItem key={idx} value={val}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Land Type Filter */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#006A4E]" />
                <span>{t('জমির শ্রেণি', 'Land Type')}</span>
              </Label>
              <Select
                value={landTypeFilter || 'ALL'}
                onValueChange={(val) => setLandTypeFilter(val === 'ALL' ? '' : val)}
              >
                <SelectTrigger className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#006A4E]">
                  <SelectValue placeholder={t('সকল শ্রেণি', 'All Land Types')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">{t('সকল শ্রেণি', 'All Land Types')}</SelectItem>
                    <SelectItem value="বাস্তু / ভিটি">{t('বাস্তু / ভিটি (আবাসিক)', 'Residential / Homestead')}</SelectItem>
                    <SelectItem value="নাল / কৃষি">{t('নাল / কৃষি', 'Agricultural')}</SelectItem>
                    <SelectItem value="বাণিজ্যিক">{t('বাণিজ্যিক প্লট', 'Commercial Plot')}</SelectItem>
                    <SelectItem value="পুকুর / ডোবা">{t('পুকুর / জলাশয়', 'Pond / Waterbody')}</SelectItem>
                    <SelectItem value="শিল্প">{t('শিল্প ও কলকারখানা', 'Industrial')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3 h-3 text-[#006A4E]" />
                <span>{t('সর্বোচ্চ মূল্য (টাকা)', 'Max Price (BDT)')}</span>
              </label>
              <Input
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="যেমন: ৫০০০000"
                className="h-10 text-xs border-slate-300"
              />
            </div>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Search className="w-3 h-3 text-[#006A4E]" />
                <span>{t('মৌজা বা দাগ', 'Mouza or Dag')}</span>
              </label>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('যেমন: ধামরাই বা ১০১', 'e.g. Dhamrai or 101')}
                className="h-10 text-xs border-slate-300"
              />
            </div>
          </div>
        </Card>

        {/* 4-State UI Coverage: Listings List */}
        {listingsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                <Skeleton className="h-6 w-28 bg-slate-200" />
                <Skeleton className="h-5 w-3/4 bg-slate-200" />
                <Skeleton className="h-16 w-full bg-slate-200 rounded-xl" />
                <Skeleton className="h-10 w-full bg-slate-200 rounded-xl" />
              </Card>
            ))}
          </div>
        ) : listingsQuery.isError ? (
          <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
            <h3 className="text-base font-bold text-rose-900">
              {t('তালিকা লোড করতে সমস্যা হয়েছে', 'Failed to load property listings')}
            </h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">
              {t('ইন্টারনেট সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।', 'Please check your connection and retry.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => listingsQuery.refetch()}
              className="border-rose-300 text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>{t('পুনরায় চেষ্টা করুন', 'Retry')}</span>
            </Button>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006A4E] mx-auto flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              {t('কোনো জমি পাওয়া যায়নি', 'No verified listings found')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t('আপনার ফিল্টার পরিবর্তন করুন অথবা সকল জমি দেখতে রিসেট চাপুন।', 'Try adjusting your filters or resetting to view all available properties.')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="border-slate-300 cursor-pointer"
            >
              {t('সকল তালিকা দেখুন', 'View All Listings')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((listing) => (
              <Card
                key={listing.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-[#006A4E]/60 shadow-sm hover:shadow-lg transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-3">
                  {/* Trust Badge Header */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs flex items-center gap-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                      <span>{t('ভেরিফাইড জমি', 'BhumiShield Verified')}</span>
                    </Badge>
                    <span className="font-mono text-xs text-slate-500 font-semibold">
                      {listing.listing_code}
                    </span>
                  </div>

                  {/* Location & Dag */}
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {listing.mouza_bn} · {t(`দাগ ${toBanglaDigits(listing.dag_no)}`, `Dag ${listing.dag_no}`)}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{listing.upazila_bn}, {listing.district_bn}</span>
                    </p>
                  </div>

                  {/* Particulars Grid */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-500 text-[10px] block">{t('জমির শ্রেণি:', 'Land Type:')}</span>
                      <strong className="text-slate-800">{listing.land_type_bn}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">{t('জমির পরিমাণ:', 'Area:')}</span>
                      <strong className="text-slate-900 font-mono">
                        {toBanglaDigits(listing.area_decimal)} {t('শতক', 'Dec')}
                      </strong>
                    </div>
                  </div>

                  {/* Asking Price */}
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
                      {t('প্রস্তাবিত বিক্রয় মূল্য:', 'Asking Price:')}
                    </span>
                    <div className="text-xl font-black text-[#006A4E] font-mono">
                      ৳ {toBanglaDigits(Number(listing.asking_price_bdt || 0).toLocaleString())}
                    </div>
                  </div>

                  {/* Description Excerpt */}
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {lang === 'bn' ? listing.description_bn : listing.description_en}
                  </p>
                </div>

                {/* Card Actions */}
                <CardFooter className="p-5 pt-0 border-t border-slate-100 grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedListing(listing)}
                    className="h-10 text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('বিস্তারিত', 'Details')}</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setEnquiryListing(listing);
                      setEnquirySuccessMsg(null);
                      setEnquiryErrorMsg(null);
                    }}
                    className="h-10 text-xs font-bold bg-[#006A4E] hover:bg-[#00553e] text-white shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{t('যোগাযোগ', 'Contact')}</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 1. LISTING DETAIL MODAL */}
      <Dialog open={Boolean(selectedListing)} onOpenChange={(open) => !open && setSelectedListing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 border border-slate-200 rounded-3xl bg-white space-y-4">
          {selectedListing && (
            <>
              <DialogHeader className="border-b border-slate-100 pb-3 text-left space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#006A4E]" />
                    <span>{t('ভেরিফাইড জমি', 'Verified Plot')}</span>
                  </Badge>
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    {selectedListing.listing_code}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-900 pt-1">
                  {selectedListing.mouza_bn} · {t(`দাগ নং: ${toBanglaDigits(selectedListing.dag_no)}`, `Plot No: ${selectedListing.dag_no}`)}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {selectedListing.upazila_bn}, {selectedListing.district_bn}
                </DialogDescription>
              </DialogHeader>

              {/* Verified Safeguards Checklist */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2 text-xs">
                <div className="font-bold text-[#006A4E] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{t('সরকারি ডাটাবেজ যাচাইকরণ বিবরণী:', 'Official Registry Verification Summary:')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>✓ {t('রেকর্ডীয় মালিকানা নিশ্চিত', 'Title confirmed')}</div>
                  <div>✓ {t('কোনো সক্রিয় ব্যাংক লিয়েন নেই', 'No active mortgage lien')}</div>
                  <div>✓ {t('দেওয়ানি বিরোধ মুক্ত', 'No court dispute')}</div>
                  <div>✓ {t('বিক্রয় উন্মুক্ত ও নিষ্কণ্টক', 'Clean & sale unblocked')}</div>
                </div>
              </div>

              {/* Price & Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">{t('মোট জমির পরিমাণ:', 'Total Area:')}</span>
                  <strong className="text-base text-slate-900 font-mono">
                    {toBanglaDigits(selectedListing.area_decimal)} {t('শতক', 'Decimals')}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">{t('বিক্রয় মূল্য:', 'Asking Price:')}</span>
                  <strong className="text-base text-[#006A4E] font-mono">
                    ৳ {toBanglaDigits(Number(selectedListing.asking_price_bdt).toLocaleString())}
                  </strong>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 text-xs">
                <span className="font-bold text-slate-700">{t('জমির বিবরণ:', 'Description:')}</span>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">
                  {lang === 'bn' ? selectedListing.description_bn : selectedListing.description_en}
                </p>
              </div>

              <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                {onNavigate && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedListing(null);
                      onNavigate(`check?dag=${encodeURIComponent(selectedListing.dag_no)}`);
                    }}
                    className="text-xs border-emerald-300 text-[#006A4E] hover:bg-emerald-50 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    <span>{t('ভূমি স্বাস্থ্য যাচাই করুন', 'Cross-Check in Due Diligence')}</span>
                  </Button>
                )}

                <Button
                  onClick={() => {
                    const l = selectedListing;
                    setSelectedListing(null);
                    setEnquiryListing(l);
                  }}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 mr-1" />
                  <span>{t('মালিকের সাথে যোগাযোগ করুন', 'Contact Verified Owner')}</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. LISTING ENQUIRY DIALOG */}
      <Dialog open={Boolean(enquiryListing)} onOpenChange={(open) => !open && setEnquiryListing(null)}>
        <DialogContent className="max-w-md p-6 border border-slate-200 rounded-3xl bg-white space-y-4">
          <DialogHeader className="border-b border-slate-100 pb-3 text-left space-y-1">
            <DialogTitle className="text-lg font-black text-slate-900">
              {t('মালিকের সাথে যোগাযোগের আবেদন', 'Contact Land Owner')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {enquiryListing?.mouza_bn} · {t(`দাগ নং ${toBanglaDigits(enquiryListing?.dag_no || '')}`, `Dag ${enquiryListing?.dag_no}`)}
            </DialogDescription>
          </DialogHeader>

          {enquirySuccessMsg ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-900">{enquirySuccessMsg}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnquiryListing(null)}
                className="cursor-pointer"
              >
                {t('সম্পন্ন', 'Done')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendEnquiry} className="space-y-3 text-xs">
              {enquiryErrorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {enquiryErrorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('আপনার নাম *', 'Your Name *')}</label>
                <Input
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder={t('যেমন: মো. কামরুল হাসান', 'e.g. Md. Kamrul Hasan')}
                  className="h-10 text-sm border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('মোবাইল নম্বর *', 'Phone Number *')}</label>
                <Input
                  required
                  type="tel"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="01712345678"
                  className="h-10 text-sm border-slate-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">{t('জাতীয় পরিচয়পত্র নম্বর (ঐচ্ছিক)', 'NID Number (Optional)')}</label>
                <Input
                  value={buyerNid}
                  onChange={(e) => setBuyerNid(e.target.value)}
                  placeholder="19912691234567890"
                  className="h-10 text-sm border-slate-300 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="font-bold text-slate-700">{t('বার্তা বা প্রস্তাব', 'Message / Offer')}</Label>
                <Textarea
                  value={enquiryMessage}
                  onChange={(e) => setEnquiryMessage(e.target.value)}
                  placeholder={t('যেমন: আমি এই জমিটি দেখতে চাই এবং ক্রয় করতে আগ্রহী।', 'e.g. I want to visit the plot.')}
                  className="min-h-[70px] text-xs"
                />
              </div>

              <DialogFooter className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnquiryListing(null)}
                  className="cursor-pointer text-xs"
                >
                  {t('বাতিল', 'Cancel')}
                </Button>

                <Button
                  type="submit"
                  disabled={submittingEnquiry}
                  className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  {submittingEnquiry ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('পাঠানো হচ্ছে...', 'Sending...')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('প্রস্তাব পাঠান', 'Send Enquiry')}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
