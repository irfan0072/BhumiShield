import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Layers,
  Building2,
  Scale,
  FileCheck2,
  ExternalLink,
  ChevronRight,
  Info,
  BadgeCheck,
} from 'lucide-react';
import { useAppUI } from '@/i18n';
import { BhumiApi } from '@/api/client';
import { toBanglaDigits } from '@/theme/tokens';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Fallback comprehensive role directory
const fallbackRoles: Record<string, any> = {
  guest: {
    tier: 'T0',
    label_bn: 'অতিথি (লগইন ব্যতীত)',
    label_en: 'Guest (Public)',
    department: 'উন্মুক্ত নাগরিক ইন্টারফেস',
    type: 'পাবলিক',
    description_bn: 'লগইন ছাড়া পাবলিক লেজার যাচাই, দলিল কিউআর কোড স্ক্যান ও নোটিশ বোর্ড পরিদর্শন।',
    permissions: ['public.qr.verify', 'public.notices.read', 'public.blog.read'],
  },
  citizen: {
    tier: 'T1',
    label_bn: 'নাগরিক (মালিক / ক্রেতা / ওয়ারিশ)',
    label_en: 'Citizen (Owner / Buyer / Heir)',
    department: 'নাগরিক ভূমি পোর্টাল',
    type: 'নাগরিক',
    description_bn: 'ব্যক্তিগত জমির ডিজিটাল ভল্ট, সেল লক, স্থানান্তর প্রস্তাব, বিরোধ দাখিল ও টিকিট ট্র্যাকিং।',
    permissions: ['transfer.start', 'plot.lock', 'dispute.file', 'ticket.create', 'vault.view'],
  },
  service_point_operator: {
    tier: 'T1',
    label_bn: 'সার্ভিস পয়েন্ট অপারেটর (ইউডিসি)',
    label_en: 'Service Point Operator (UDC)',
    department: 'ইউনিয়ন ডিজিটাল সেন্টার (UDC)',
    type: 'সহায়ক',
    description_bn: 'নাগরিকের পক্ষে আবেদন, কাউন্টার বায়োমেট্রিক ক্যাপচার, কাগজ স্ক্যান ও রশিদ প্রিন্ট।',
    permissions: ['biometric.capture', 'citizen.assist', 'document.scan'],
  },
  registry_data_officer: {
    tier: 'T2',
    label_bn: 'রেজিস্ট্রি ডাটা এন্ট্রি অফিসার',
    label_en: 'Registry Data Officer (Maker)',
    department: 'নিবন্ধন অধিদপ্তর (আইন মন্ত্রণালয়)',
    type: 'মেকার (Maker)',
    description_bn: 'দলিল নিবন্ধনের প্রাথমিক তথ্য প্রস্তুতকরণ, ক্রেতা-বিক্রেতা ও দাগ তথ্যের স্ট্যাজিং এন্ট্রি।',
    permissions: ['deed_record.enter', 'deed.draft', 'buyer_seller.verify'],
  },
  sub_registrar: {
    tier: 'T2',
    label_bn: 'সাব-রেজিস্ট্রার',
    label_en: 'Sub-Registrar (Checker)',
    department: 'নিবন্ধন অধিদপ্তর (আইন মন্ত্রণালয়)',
    type: 'চেকার / বিচারিক',
    description_bn: 'প্রাক-নিবন্ধন যাচাই, কাউন্টার বায়োমেট্রিক সম্মতি এবং Ed25519 ডিজিটাল স্বাক্ষরিত দলিল নিবন্ধন।',
    permissions: ['deed.register', 'deed_record.verify', 'biometric.capture', 'digital_seal.apply'],
  },
  joint_sub_registrar: {
    tier: 'T2',
    label_bn: 'যুগ্ম সাব-রেজিস্ট্রার',
    label_en: 'Joint Sub-Registrar',
    department: 'নিবন্ধন অধিদপ্তর (আইন মন্ত্রণালয়)',
    type: 'চেকার (Checker)',
    description_bn: 'যুগ্ম সাব-রেজিস্ট্রি সার্কেলে দলিল রেজিস্ট্রি, বায়োমেট্রিক নিবেদন ও ডিজিটাল স্ট্যাম্পিং।',
    permissions: ['deed.register', 'biometric.capture'],
  },
  district_registrar: {
    tier: 'T2',
    label_bn: 'জেলা রেজিস্ট্রার',
    label_en: 'District Registrar',
    department: 'নিবন্ধন অধিদপ্তর (আইন মন্ত্রণালয়)',
    type: 'তদারকি',
    description_bn: 'জেলা পর্যায়ের সকল সাব-রেজিস্ট্রি কার্যালয়ের পরিদর্শন, তদারকি ও প্রশাসনিক শৃঙ্খলা রক্ষা।',
    permissions: ['registry.inspect', 'registry.audit', 'officer.supervise'],
  },
  land_office_assistant: {
    tier: 'T2',
    label_bn: 'উপজেলা ভূমি সহকারী',
    label_en: 'Land Office Assistant (Maker)',
    department: 'উপজেলা ভূমি অফিস (ভূমি মন্ত্রণালয়)',
    type: 'মেকার (Maker)',
    description_bn: 'নামজারি নথি প্রক্রিয়াকরণ, নোটিশ প্রস্তুতকরণ ও রেকর্ডরুম ডাটা এন্ট্রি।',
    permissions: ['mutation.process', 'notice.draft', 'record.enter'],
  },
  field_verification_officer: {
    tier: 'T2',
    label_bn: 'ফিল্ড ভেরিফিকেশন অফিসার (সার্ভেয়ার)',
    label_en: 'Field Verification Officer',
    department: 'উপজেলা ভূমি অফিস (ভূমি মন্ত্রণালয়)',
    type: 'মাঠ তদন্ত',
    description_bn: 'মাঠপর্যায়ে জমির দখল তদন্ত, ছবি ও ভূ-অবস্থান প্রতিবেদন এবং এলডি ট্যাক্স হোল্ডিং যাচাই।',
    permissions: ['field.inspect', 'geotag.upload', 'possession.verify'],
  },
  ac_land: {
    tier: 'T2',
    label_bn: 'সহকারী কমিশনার - ভূমি (এসি ল্যান্ড)',
    label_en: 'Assistant Commissioner of Land',
    department: 'উপজেলা ভূমি অফিস (ভূমি মন্ত্রণালয়)',
    type: 'চেকার / বিচারিক',
    description_bn: 'ই-নামজারি অনুমোদন/খারিজ, শুনানি, খতিয়ান সমন্বয় ও বিরোধ নিষ্পত্তি। একমাত্র সাংবিধানিক মালিকানা পরিবর্তনের ক্ষমতা।',
    permissions: ['ownership.approve', 'mutation.sign', 'khatian.reconcile', 'hearing.conduct'],
  },
  uno_supervisor: {
    tier: 'T2',
    label_bn: 'উপজেলা নির্বাহী কর্মকর্তা (ইউএনও)',
    label_en: 'Upazila Nirbahi Officer (UNO)',
    department: 'উপজেলা প্রশাসন (মন্ত্রিপরিষদ বিভাগ)',
    type: 'তদারকি',
    description_bn: 'উপজেলা পর্যায়ে বিলম্বিত নামজারি ও এসএলএ অতিক্রমকারী মামলার এসকেলেশন তদারকি।',
    permissions: ['sla.escalate', 'performance.review', 'case.monitor'],
  },
  appellate_reviewer: {
    tier: 'T2',
    label_bn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব - আপিল)',
    label_en: 'ADC Revenue (Appellate)',
    department: 'জেলা রাজস্ব প্রশাসন',
    type: 'আপিল আদালত',
    description_bn: 'নামজারি আপিল ও আদালতের আদেশ পর্যালোচনা এবং ফলাফল নথিভুক্তকরণ।',
    permissions: ['appeal.review', 'decree.record', 'hearing.appellate'],
  },
  divisional_commissioner: {
    tier: 'T2',
    label_bn: 'বিভাগীয় কমিশনার',
    label_en: 'Divisional Commissioner',
    department: 'বিভাগীয় কমিশনার কার্যালয়',
    type: 'বিভাগীয় প্রধান',
    description_bn: 'বিভাগীয় পর্যায়ে রাজস্ব প্রশাসন, নামজারি আপিল নিষ্পত্তি ও আন্তঃজেলা ভূমি ব্যবস্থাপনা তদারকি।',
    permissions: ['divisional.appellate', 'revenue.inspect', 'cross_district.oversee'],
  },
  settlement_records_officer: {
    tier: 'T2',
    label_bn: 'সেটেলমেন্ট রেকর্ডস অফিসার',
    label_en: 'Settlement Records Officer (Maker)',
    department: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)',
    type: 'মেকার (Maker)',
    description_bn: 'চলমান জরিপ (সিএস/এসএ/আরএস/বিএস) খতিয়ান ডাটা প্রস্তুত ও স্ট্যাজিং এন্ট্রি।',
    permissions: ['khatian.enter', 'survey.draft', 'boundary.plot'],
  },
  settlement_checker: {
    tier: 'T2',
    label_bn: 'সহকারী সেটেলমেন্ট অফিসার (জরিপ চেকার)',
    label_en: 'Assistant Settlement Officer (Checker)',
    department: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)',
    type: 'চেকার (Checker)',
    description_bn: 'সেটেলমেন্ট রেকর্ডস অফিসারের ডাটা যাচাই ও লেজারে চূড়ান্ত গেজেট প্রকাশ অনুমোদন।',
    permissions: ['khatian.verify', 'gazette.publish', 'survey.approve'],
  },
  dlrs_officer: {
    tier: 'T2',
    label_bn: 'ডিএলআরএস কর্মকর্তা (ক্যাডাস্ট্রাল)',
    label_en: 'DLRS Officer (Cadastral GIS)',
    department: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)',
    type: 'ক্যাডাস্ট্রাল অডিট',
    description_bn: 'জাতীয় ডিজিটাল ক্যাডাস্ট্রাল জরিপ, মৌজা মানচিত্র প্রণয়ন ও জিআইএস সমন্বয়।',
    permissions: ['cadastral.map', 'gis.coordinate', 'boundary.reconcile'],
  },
  bank_officer: {
    tier: 'T2',
    label_bn: 'ব্যাংক ঋণ কর্মকর্তা (জামানত মেকার)',
    label_en: 'Bank Credit Officer (Maker)',
    department: 'তফসিলি ব্যাংক ও আর্থিক প্রতিষ্ঠান',
    type: 'মেকার (Maker)',
    description_bn: 'জমির জামানত ঝুঁকি যাচাই, বন্ধক লিয়েন প্রস্তুত ও ছাড়পত্র খসড়া তৈরি।',
    permissions: ['collateral.check', 'mortgage.draft', 'lien.propose'],
  },
  bank_manager: {
    tier: 'T2',
    label_bn: 'ব্যাংক শাখা ব্যবস্থাপক (জামানত চেকার)',
    label_en: 'Bank Branch Manager (Checker)',
    department: 'তফসিলি ব্যাংক ও আর্থিক প্রতিষ্ঠান',
    type: 'চেকার (Checker)',
    description_bn: 'বন্ধক লিয়েন অনুমোদন, ঋণ অবমুক্তকরণ ও ডিজিটাল এনওসি চূড়ান্ত স্বাক্ষর।',
    permissions: ['mortgage.approve', 'lien.release', 'noc.issue'],
  },
  lawyer_court_user: {
    tier: 'T2',
    label_bn: 'আইনজীবী / দেওয়ানি আদালত প্রতিনিধি',
    label_en: 'Advocate / Court Representative',
    department: 'বাংলাদেশ বার কাউন্সিল ও দেওয়ানি আদালত',
    type: 'আইনি প্রতিনিধি',
    description_bn: 'মালিকানা স্বত্ব মামলা ও নিষেধাজ্ঞার সার্টিফাইড কপি দাখিল ও নিরীক্ষণ।',
    permissions: ['lawsuit.file', 'injunction.submit', 'decree.verify'],
  },
  dc_acquisition_officer: {
    tier: 'T2',
    label_bn: 'এলএ কর্মকর্তা (ভূমি অধিগ্রহণ শাখা)',
    label_en: 'DC Land Acquisition Officer',
    department: 'জেলা প্রশাসক কার্যালয় (LA শাখা)',
    type: 'সরকারি সংস্থা',
    description_bn: 'সরকারি প্রকল্প ও জাতীয় স্বার্থে ভূমি অধিগ্রহণ নোটিশ ও গেজেট ট্র্যাকিং।',
    permissions: ['la_case.track', 'gazette.record'],
  },
  forest_officer: {
    tier: 'T2',
    label_bn: 'বিভাগীয় বন কর্মকর্তা (ডিএফও)',
    label_en: 'Divisional Forest Officer',
    department: 'বন অধিদপ্তর (পরিবেশ মন্ত্রণালয়)',
    type: 'সংরক্ষিত ভূমি',
    description_bn: 'সংরক্ষিত ও অর্পিত বনভূমির সীমানা সংরক্ষণ, দখল প্রতিরোধ ও অনাপত্তি (NOC) যাচাই।',
    permissions: ['forest.boundary.verify', 'forest.noc.issue'],
  },
  waqf_administrator: {
    tier: 'T2',
    label_bn: 'ওয়াকফ ও দেবোত্তর এস্টেট প্রশাসক',
    label_en: 'Waqf & Religious Estate Admin',
    department: 'ধর্ম বিষয়ক মন্ত্রণালয়',
    type: 'ধর্মীয় ট্রাস্ট',
    description_bn: 'ওয়াকফ সম্পত্তি, দেবোত্তর এস্টেট ও ধর্মীয় ট্রাস্টের ভূমি সুরক্ষা ও অননুমোদিত হস্তান্তর রোধ।',
    permissions: ['waqf.verify', 'debottar.defend'],
  },
  karbari: {
    tier: 'T2',
    label_bn: 'কার্বারি / মৌজা হেডম্যান',
    label_en: 'Karbari / Headman (CHT)',
    department: 'পার্বত্য চট্টগ্রাম প্রথাগত প্রশাসন',
    type: 'প্রথাগত ভূমি',
    description_bn: 'পার্বত্য চট্টগ্রাম প্রথাগত ভূমি ব্যবস্থাপনা, মৌজা কর যাচাই ও আদিবাসী মালিকানা প্রত্যায়ন।',
    permissions: ['customary.certify', 'mouza_tax.verify'],
  },
  support_agent: {
    tier: 'T2',
    label_bn: 'সাপোর্ট এজেন্ট (১৬১২২ হেল্পলাইন)',
    label_en: 'Support Agent (16122 Helpline)',
    department: 'জাতীয় ভূমি হেল্পলাইন',
    type: 'সহায়ক',
    description_bn: 'নাগরিক অভিযোগ ও টিকিট ট্রায়াজ, সাধারণ পরামর্শ এবং সংশ্লিষ্ট অফিসে রেফারেল।',
    permissions: ['ticket.triage', 'citizen.assist', 'faq.dispatch'],
  },
  platform_moderator: {
    tier: 'T2',
    label_bn: 'প্ল্যাটফর্ম মডারেটর',
    label_en: 'Platform Moderator',
    department: 'পাবলিক মার্কেটপ্লেস সুরক্ষা',
    type: 'মডারেশন',
    description_bn: 'জমি বিক্রয় তালিকার সত্যতা যাচাই, প্রতারণামূলক বিজ্ঞাপন আনলিস্ট ও পর্যবেক্ষণ।',
    permissions: ['sale.moderate', 'listing.unlist', 'fraud.flag'],
  },
  content_editor: {
    tier: 'T2',
    label_bn: 'কনটেন্ট এডিটর',
    label_en: 'Content Editor',
    department: 'জনসচেতনতা ও যোগাযোগ শাখা',
    type: 'মেকার (Maker)',
    description_bn: 'নাগরিক সচেতনতা নির্দেশিকা, আইনি ব্যাখ্যা ও অফিস নোটিশের খসড়া তৈরি।',
    permissions: ['notice.draft', 'blog.write'],
  },
  content_approver: {
    tier: 'T2',
    label_bn: 'কনটেন্ট অ্যাপ্রুভার',
    label_en: 'Content Approver',
    department: 'জনসচেতনতা ও যোগাযোগ শাখা',
    type: 'চেকার (Checker)',
    description_bn: 'নোটিশ ও ব্লগ অনুমোদন এবং ডিজিটাল কিউআর সিলসহ গেজেট প্রকাশ।',
    permissions: ['notice.publish', 'blog.approve'],
  },
  system_admin: {
    tier: 'T3',
    label_bn: 'সিস্টেম ও আইটি অ্যাডমিন',
    label_en: 'System & IT Admin',
    department: 'কেন্দ্রীয় ক্লাউড ও আইটি অবকাঠামো',
    type: 'সিস্টেম গভর্ন্যান্স',
    description_bn: 'ব্যবহারকারী ব্যবস্থাপনা, আরবিক কনফিগারেশন, সিস্টেম প্যারামিটার ও ক্রিপ্টো কী পর্যবেক্ষণ। কোনো জমি ডাটা সম্পাদনা আইনত নিষিদ্ধ।',
    permissions: ['user.manage', 'rbac.configure', 'settings.update', 'key.monitor'],
  },
  admin: {
    tier: 'T3',
    label_bn: 'জাতীয় সিস্টেম অ্যাডমিন',
    label_en: 'National System Administrator',
    department: 'কেন্দ্রীয় ডিজিটাল প্রশাসন ও প্ল্যাটফর্ম কনসোল',
    type: 'সার্বভৌম প্রশাসন',
    description_bn: 'প্ল্যাটফর্ম পরিচালনা, সিস্টেম সেটিংস, কর্মকর্তা বদলি ও ব্যাকআপ প্রশাসন। জমি রেকর্ড পরিবর্তন আইনত নিষিদ্ধ।',
    permissions: ['system.manage', 'officer.transfer', 'backup.export', 'broadcast.publish', 'settings.all'],
  },
  auditor: {
    tier: 'T3',
    label_bn: 'জাতীয় ক্রিপ্টোগ্রাফিক অডিটর',
    label_en: 'Cryptographic Ledger Auditor',
    department: 'কম্পট্রোলার অ্যান্ড অডিটর জেনারেল / জাতীয় সাইবার সুরক্ষা',
    type: 'অডিট ও নিরীক্ষা',
    description_bn: 'হ্যাশ চেইনের অবিচ্ছিন্নতা অডিট, ব্রেক-গ্লাস অ্যাক্সেস লগ ও নিরাপত্তা অডিট রিপোর্ট পরিদর্শন।',
    permissions: ['ledger.verify', 'audit.inspect', 'tamper.report', 'breakglass.view'],
  },
};

export const AdminRolesPage: React.FC<{ onNavigateToUsers?: (roleFilter: string) => void }> = ({
  onNavigateToUsers,
}) => {
  const { lang, t } = useAppUI();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  useEffect(() => {
    BhumiApi.listUsers()
      .then((users: any[]) => {
        const counts: Record<string, number> = {};
        if (Array.isArray(users)) {
          users.forEach((u) => {
            const r = u.role || 'citizen';
            counts[r] = (counts[r] || 0) + 1;
          });
        }
        setUserCounts(counts);
      })
      .catch(() => {});
  }, []);

  const rolesList = Object.entries(fallbackRoles).map(([key, data]) => ({
    key,
    ...data,
    activeUsersCount: userCounts[key] || 0,
  }));

  const filteredRoles = rolesList.filter((r) => {
    const matchesTier = tierFilter === 'ALL' || r.tier === tierFilter;
    const q = search.toLowerCase();
    const matchesQuery =
      !search ||
      r.key.toLowerCase().includes(q) ||
      r.label_bn.toLowerCase().includes(q) ||
      r.label_en.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q);
    return matchesTier && matchesQuery;
  });

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 p-3 sm:p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Search and Filter Bar */}
      <Card className="shrink-0 border border-border/80 shadow-2xs bg-card p-2 sm:p-2.5 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('রোল বা বিভাগ দিয়ে খুঁজুন...', 'Search role or dept...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8 rounded-lg border-border"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 shrink-0">
              {t('মোট:', 'Total:')} {toBanglaDigits(filteredRoles.length, lang)} {t('টি রোল', 'Roles')}
            </Badge>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs font-medium rounded-lg border-border">
                <SelectValue placeholder={t('সকল টায়ার', 'All Tiers')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('সকল টায়ার (All Tiers)', 'All Tiers')}</SelectItem>
                <SelectItem value="T0">{t('টায়ার ০ (পাবলিক)', 'Tier 0 (Public)')}</SelectItem>
                <SelectItem value="T1">{t('টায়ার ১ (নাগরিক)', 'Tier 1 (Citizen)')}</SelectItem>
                <SelectItem value="T2">{t('টায়ার ২ (কর্মকর্তা)', 'Tier 2 (Official)')}</SelectItem>
                <SelectItem value="T3">{t('টায়ার ৩ (অ্যাডমিন)', 'Tier 3 (Admin)')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 3. Complete Roles Table with Single-Screen Scroll */}
      <Card className="flex-1 min-h-0 border border-border/80 shadow-2xs bg-card rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur-xs z-20 border-b border-border shadow-xs">
              <TableRow className="text-xs hover:bg-transparent">
                <TableHead className="w-[120px] h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('টায়ার ও কোড', 'Tier & Code')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('রোলের নাম', 'Role Title')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('বিভাগ', 'Department')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground bg-muted/95">{t('ক্যাটাগরি', 'Category')}</TableHead>
                <TableHead className="w-[110px] h-9 py-1.5 font-bold text-foreground text-center bg-muted/95">{t('ইউজার', 'Users')}</TableHead>
                <TableHead className="h-9 py-1.5 font-bold text-foreground text-right bg-muted/95">{t('অনুমতি ও অ্যাকশন', 'Permissions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((r) => (
                <TableRow key={r.key} className="text-xs hover:bg-muted/40 transition">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant="outline"
                        className={`w-fit font-mono text-[10px] ${
                          r.tier === 'T3'
                            ? 'border-purple-300 text-purple-800 bg-purple-50'
                            : r.tier === 'T2'
                            ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                            : r.tier === 'T1'
                            ? 'border-blue-300 text-blue-800 bg-blue-50'
                            : 'border-slate-300 text-slate-800 bg-slate-50'
                        }`}
                      >
                        {r.tier}
                      </Badge>
                      <span className="font-mono text-[11px] font-bold text-muted-foreground">{r.key}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-bold text-foreground">{lang === 'bn' ? r.label_bn : r.label_en}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">{lang === 'bn' ? r.description_bn : r.description_en}</div>
                  </TableCell>

                  <TableCell>
                    <span className="text-muted-foreground font-medium">{r.department}</span>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {r.type}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center font-mono font-bold text-foreground">
                    <span className="inline-flex items-center justify-center size-6 rounded-full bg-muted text-xs">
                      {toBanglaDigits(r.activeUsersCount, lang)}
                    </span>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onNavigateToUsers && r.tier !== 'T0' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onNavigateToUsers(r.key)}
                          className={`h-7 px-2 text-xs font-semibold gap-1 ${
                            r.tier === 'T1'
                              ? 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                              : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                          }`}
                          title={
                            r.tier === 'T1'
                              ? t('নাগরিক অ্যাকাউন্ট তালিকায় যান', 'View Citizen Accounts')
                              : t('কর্মকর্তা অ্যাকাউন্টে যান ও সরাসরি লগইন করুন', 'View Official Accounts & Login')
                          }
                        >
                          <Users className="size-3" />
                          <span>{r.tier === 'T1' ? t('নাগরিক তালিকা', 'Citizens') : t('কর্মকর্তা একাউন্ট', 'Accounts')}</span>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRole(r)}
                        className="h-7 px-2 text-xs font-semibold gap-1 text-emerald-800 hover:text-emerald-950 border-emerald-200"
                      >
                        <Info className="size-3 text-emerald-600" />
                        <span>{t('পারমিশন দেখুন', 'Permissions')}</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 5. Role Details & Granular Permissions Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">{selectedRole.tier}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{selectedRole.key}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {lang === 'bn' ? selectedRole.label_bn : selectedRole.label_en}
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRole(null)} className="h-7 w-7 p-0">
                ✕
              </Button>
            </div>

            <div className="text-xs space-y-2">
              <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">{t('আইনগত এখতিয়ার ও দায়িত্ব:', 'Statutory Authority:')}</span>
                <p className="text-foreground">{lang === 'bn' ? selectedRole.description_bn : selectedRole.description_en}</p>
              </div>

              <div>
                <span className="text-xs font-bold text-foreground">{t('অনুমোদিত পারমিশন তালিকা (Permitted Capabilities):', 'Granular Permissions:')}</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedRole.permissions && selectedRole.permissions.length > 0 ? (
                    selectedRole.permissions.map((p: string) => (
                      <Badge key={p} variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="size-2.5 text-emerald-600" />
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">{t('কোনো বিশেষ পারমিশন অ্যাসাইন করা নেই।', 'Standard public permissions.')}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              {onNavigateToUsers && selectedRole.tier !== 'T0' ? (
                <Button
                  size="sm"
                  onClick={() => {
                    const roleKey = selectedRole.key;
                    setSelectedRole(null);
                    onNavigateToUsers(roleKey);
                  }}
                  className="h-8 text-xs font-semibold bg-[#006A4E] hover:bg-[#00553e] text-white gap-1.5"
                >
                  <Users className="size-3.5" />
                  <span>
                    {selectedRole.tier === 'T1'
                      ? t('নাগরিকদের অ্যাকাউন্টে যান →', 'Go to Citizen Accounts →')
                      : t('কর্মকর্তার অ্যাকাউন্টে যান ও লগইন করুন →', 'Go to Officer Accounts & Login →')}
                  </span>
                </Button>
              ) : <div />}
              <Button variant="outline" size="sm" onClick={() => setSelectedRole(null)} className="h-8 text-xs font-semibold">
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
