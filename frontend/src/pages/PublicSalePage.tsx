import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, MessageSquare, RotateCcw, Search, ShieldCheck, Store, TriangleAlert, X } from 'lucide-react';
import { useAppUI } from '../i18n';
import { BhumiApi } from '../api/client';
import { toBanglaDigits } from '../theme/tokens';
import { cn } from '@/lib/utils';
import { useListings, useLocationsQuery } from '../components/publicHooks';
import { PublicHero, PublicSection, landImg } from '@/components/public/PublicPage';
import { DetailList, EmptyState, StatusBadge } from '@/components/admin/kit';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsivePanel } from './notices/ReaderPanel';
import { EnquiryDialog } from './sale/EnquiryDialog';
import { PRICE_RANGES, isVerified, takaFull, takaShort, type ListingItem } from './sale/saleUtils';

const ALL = 'ALL';
const MAX_Q = 40;

const selectCls = 'h-11 w-full rounded-xl border-slate-200 bg-white text-sm';

export const PublicSalePage: React.FC<{ onNavigate?: (tab: string) => void }> = () => {
  const { t, lang } = useAppUI();
  const n = (v: number | string) => toBanglaDigits(v, lang);
  const pick = (bn?: string, en?: string) => (lang === 'bn' ? bn || en || '' : en || bn || '');

  /* ---------- filters ---------- */
  const [query, setQuery] = useState('');
  const [division, setDivision] = useState(ALL);
  const [district, setDistrict] = useState(ALL);
  const [landType, setLandType] = useState(ALL);
  const [price, setPrice] = useState(ALL);

  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ['hierarchyDivisions'],
    queryFn: () => BhumiApi.getHierarchyDivisions(),
    staleTime: 10 * 60 * 1000,
  });
  const { data: districts = [] } = useQuery<any[]>({
    queryKey: ['hierarchyDistricts', division],
    queryFn: () => BhumiApi.getHierarchyDistricts(division),
    enabled: division !== ALL,
    staleTime: 10 * 60 * 1000,
  });
  const { data: locations = [] } = useLocationsQuery();

  const range = PRICE_RANGES.find((r) => r.id === price);
  const listings = useListings({
    district: district !== ALL ? district : undefined,
    min_price: range?.min,
    max_price: range?.max,
  });
  const raw: ListingItem[] = listings.data?.items || [];

  /** Listing rows have no division or location id; look them up from /locations. */
  const locOf = useMemo(() => {
    const m = new Map<string, any>();
    for (const l of locations as any[]) m.set(`${l.district_bn}|${l.upazila_bn}|${l.mouza_bn}`, l);
    return (x: ListingItem) => m.get(`${x.district_bn}|${x.upazila_bn}|${x.mouza_bn}`);
  }, [locations]);

  const landTypes = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of raw) if (x.land_type_bn) m.set(x.land_type_bn, pick(x.land_type_bn, x.land_type_en));
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, lang]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const divDistricts = new Set((districts as any[]).map((d) => d.district_bn));
    return raw.filter((x) => {
      if (landType !== ALL && x.land_type_bn !== landType) return false;
      if (division !== ALL && district === ALL) {
        const loc = locOf(x);
        const inDiv = loc ? loc.division_bn === division : divDistricts.has(x.district_bn);
        if (!inDiv) return false;
      }
      if (!q) return true;
      return [x.mouza_bn, x.mouza_en, x.upazila_bn, x.upazila_en, x.dag_no, x.dag_no_bn, x.listing_code].some((v) =>
        String(v || '').toLowerCase().includes(q)
      );
    });
  }, [raw, query, landType, division, district, districts, locOf]);

  const filtersOn = !!query || division !== ALL || district !== ALL || landType !== ALL || price !== ALL;
  const reset = () => {
    setQuery('');
    setDivision(ALL);
    setDistrict(ALL);
    setLandType(ALL);
    setPrice(ALL);
  };

  /* ---------- detail + enquiry ---------- */
  const [selected, setSelected] = useState<ListingItem | null>(null);
  const [enquiry, setEnquiry] = useState<ListingItem | null>(null);

  const checkHref = (x: ListingItem) => {
    const q = new URLSearchParams();
    const dag = String(x.dag_no || '').replace(/[^\p{L}\p{N}\-/]/gu, '').slice(0, 12);
    if (dag) q.set('dag', dag);
    const loc = locOf(x);
    if (loc?.id) q.set('mouza', String(loc.id));
    if (x.plot_id) q.set('plot_id', String(Number(x.plot_id)));
    return `/${lang}/check?${q.toString()}`;
  };

  return (
    <div className="bg-white">
      <PublicHero
        image="landtech-hackathon-hero"
        tone="light"
        icon={Store}
        position="65% center"
        title={t('যাচাইকৃত জমি বিক্রয়', 'Verified land for sale')}
        subtitle={t('সরকারি রেকর্ডে যাচাই করা জমি', 'Land checked against official records')}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/5">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,10.5rem)_auto]">
            <div className="relative col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value.slice(0, MAX_Q))}
                maxLength={MAX_Q}
                type="search"
                placeholder={t('মৌজা বা দাগ নম্বর', 'Mouza or dag no')}
                aria-label={t('মৌজা বা দাগ নম্বর', 'Mouza or dag no')}
                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/15"
              />
            </div>

            <Select
              value={division}
              onValueChange={(v) => {
                setDivision(v);
                setDistrict(ALL);
              }}
            >
              <SelectTrigger className={selectCls} aria-label={t('বিভাগ', 'Division')}>
                <SelectValue placeholder={t('বিভাগ', 'Division')} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>{t('সব বিভাগ', 'All divisions')}</SelectItem>
                {(divisions as any[]).filter((d) => d?.division_bn).map((d) => (
                  <SelectItem key={d.division_bn} value={d.division_bn}>
                    {pick(d.division_bn, d.division_en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={district} onValueChange={setDistrict} disabled={division === ALL}>
              <SelectTrigger className={selectCls} aria-label={t('জেলা', 'District')}>
                <SelectValue placeholder={t('জেলা', 'District')} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>{t('সব জেলা', 'All districts')}</SelectItem>
                {(districts as any[]).filter((d) => d?.district_bn).map((d) => (
                  <SelectItem key={d.district_bn} value={d.district_bn}>
                    {pick(d.district_bn, d.district_en)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={landType} onValueChange={setLandType}>
              <SelectTrigger className={selectCls} aria-label={t('জমির ধরন', 'Land type')}>
                <SelectValue placeholder={t('জমির ধরন', 'Land type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('সব ধরন', 'All types')}</SelectItem>
                {landTypes.map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={price} onValueChange={setPrice}>
              <SelectTrigger className={selectCls} aria-label={t('দাম', 'Price')}>
                <SelectValue placeholder={t('দাম', 'Price')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('যেকোনো দাম', 'Any price')}</SelectItem>
                {PRICE_RANGES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {lang === 'bn' ? r.bn : r.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {filtersOn && (
              <button
                type="button"
                onClick={reset}
                className="col-span-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm text-slate-600 hover:bg-slate-100 cursor-pointer lg:col-span-1"
              >
                <X className="size-4" />
                {t('মুছুন', 'Clear')}
              </button>
            )}
          </div>
        </div>
      </PublicHero>

      <PublicSection className="py-4 sm:py-6">
        {listings.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl sm:h-64" />
            ))}
          </div>
        ) : listings.isError ? (
          <EmptyState
            icon={TriangleAlert}
            text={t('তালিকা আনা যায়নি', 'Could not load listings')}
            action={
              <button
                type="button"
                onClick={() => listings.refetch()}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
              >
                <RotateCcw className="size-4" />
                {t('আবার চেষ্টা', 'Try again')}
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Store}
            text={t('এই খোঁজে কোনো জমি নেই', 'No land matches this search')}
            action={
              filtersOn && (
                <button
                  type="button"
                  onClick={reset}
                  className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:border-[#006A4E] hover:text-[#006A4E] cursor-pointer"
                >
                  {t('সব জমি দেখুন', 'Show all')}
                </button>
              )
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">{t(`${n(items.length)}টি জমি`, `${items.length} plots`)}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(x)}
                    className="group flex h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-left transition hover:border-[#006A4E]/40 hover:shadow-md cursor-pointer sm:flex-col"
                  >
                    <span className="relative block w-28 shrink-0 bg-slate-100 sm:h-32 sm:w-full">
                      <img
                        src={landImg('digital-mouza-map', true)}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {isVerified(x) && (
                        <span className="absolute left-2 top-2 hidden rounded-full bg-white sm:block">
                          <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
                        </span>
                      )}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1 p-3">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate font-semibold text-slate-900">{pick(x.mouza_bn, x.mouza_en)}</span>
                        {isVerified(x) && (
                          <StatusBadge tone="green" className="shrink-0 sm:hidden">{t('যাচাইকৃত', 'Verified')}</StatusBadge>
                        )}
                      </span>
                      <span className="flex items-center gap-1 truncate text-xs text-slate-500">
                        <MapPin className="size-3.5 shrink-0" />
                        {pick(x.upazila_bn, x.upazila_en)}, {pick(x.district_bn, x.district_en)}
                      </span>
                      <span className="text-sm text-slate-600">
                        {t('দাগ', 'Dag')} {n(x.dag_no)} · {n(x.area_decimal)} {t('শতক', 'dec')}
                      </span>
                      <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <span className="text-base font-bold text-[#006A4E]">{takaShort(x.asking_price_bdt, lang)}</span>
                        <span className="text-sm font-medium text-slate-500 group-hover:text-[#006A4E]">{t('বিস্তারিত', 'Details')}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {(listings.data?.disclaimer_bn || listings.data?.disclaimer_en) && (
              <p className="mt-4 text-xs text-slate-500">
                {t('বিজ্ঞাপন মালিকানার সনদ নয়। লেনদেন শুধু সাব-রেজিস্ট্রি অফিসে।', 'A listing is not proof of ownership. Transfers happen only at the sub-registry office.')}
              </p>
            )}
          </>
        )}
      </PublicSection>

      {/* Detail */}
      <ResponsivePanel
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected ? `${pick(selected.mouza_bn, selected.mouza_en)} · ${t('দাগ', 'Dag')} ${n(selected.dag_no)}` : ''}
        meta={selected && `${pick(selected.upazila_bn, selected.upazila_en)}, ${pick(selected.district_bn, selected.district_en)}`}
        footer={
          selected && (
            <>
              <a
                href={checkHref(selected)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#006A4E]/30 px-4 text-sm font-medium text-[#006A4E] hover:bg-emerald-50"
              >
                <ShieldCheck className="size-4" />
                {t('জমি যাচাই করুন', 'Check this land')}
              </a>
              <button
                type="button"
                onClick={() => {
                  const l = selected;
                  setSelected(null);
                  setEnquiry(l);
                }}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#006A4E] px-4 text-sm font-medium text-white hover:bg-[#00553e] cursor-pointer"
              >
                <MessageSquare className="size-4" />
                {t('বিক্রেতাকে বার্তা', 'Message seller')}
              </button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl bg-slate-100">
              <img src={landImg('digital-mouza-map', true)} alt="" className="aspect-[16/9] w-full object-cover" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-2xl font-bold text-[#006A4E]">{takaFull(selected.asking_price_bdt, lang)}</p>
              <div className="flex flex-wrap gap-1.5">
                {isVerified(selected) && <StatusBadge tone="green">{t('যাচাইকৃত', 'Verified')}</StatusBadge>}
                {!!Number(selected.co_owner_consent_confirmed) && <StatusBadge tone="blue">{t('সহ-মালিক রাজি', 'Co-owners agree')}</StatusBadge>}
              </div>
            </div>
            <DetailList
              items={[
                [t('মৌজা', 'Mouza'), pick(selected.mouza_bn, selected.mouza_en)],
                [t('দাগ নম্বর', 'Dag no'), n(selected.dag_no)],
                [t('পরিমাণ', 'Area'), `${n(selected.area_decimal)} ${t('শতক', 'decimal')}`],
                !!(selected.land_type_bn || selected.land_type_en) && [t('জমির ধরন', 'Land type'), pick(selected.land_type_bn, selected.land_type_en)],
                [t('এলাকা', 'Location'), `${pick(selected.upazila_bn, selected.upazila_en)}, ${pick(selected.district_bn, selected.district_en)}`],
                !!selected.seller_nid_masked && [t('বিক্রেতার NID', 'Seller NID'), <span className="font-mono">{n(selected.seller_nid_masked)}</span>],
                [t('বিজ্ঞাপন নং', 'Listing no'), <span className="font-mono text-xs">{selected.listing_code}</span>],
              ]}
            />
            {!!pick(selected.description_bn, selected.description_en) && (
              <p className="text-sm leading-6 text-slate-600">{pick(selected.description_bn, selected.description_en)}</p>
            )}
            <p className="text-xs text-slate-500">{t('কেনার আগে অবশ্যই জমি যাচাই করুন।', 'Always check the land before buying.')}</p>
          </div>
        )}
      </ResponsivePanel>

      <EnquiryDialog listing={enquiry} onOpenChange={(o) => !o && setEnquiry(null)} />
    </div>
  );
};

export default PublicSalePage;
