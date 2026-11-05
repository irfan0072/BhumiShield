import React, { useState } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { CitizenVerificationModal } from '../components/CitizenVerificationModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  LogIn,
  UserPlus,
  KeyRound,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Building2,
  FileText,
  HelpCircle,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Sparkles,
  Search,
  Check,
  Shield,
  Fingerprint,
  FileCheck2,
} from 'lucide-react';

const ROLE_ROUTE: Record<string, string> = {
  citizen: 'home',
  service_point_operator: 'home',
  sub_registrar: 'registrar',
  registry_data_officer: 'registrar',
  ac_land: 'acland',
  land_office_assistant: 'acland',
  field_verification_officer: 'acland',
  settlement_records_officer: 'acland',
  settlement_checker: 'acland',
  uno_supervisor: 'acland',
  appellate_reviewer: 'acland',
  bank_officer: 'bank',
  bank_manager: 'bank',
  admin: 'admin',
  system_admin: 'admin',
  auditor: 'admin',
  support_agent: 'admin',
  platform_moderator: 'admin',
  content_editor: 'admin',
  content_approver: 'admin',
  dc_acquisition_officer: 'specialist',
  lawyer_court_user: 'specialist',
};

export interface DemoCredentialItem {
  username: string;
  password: string;
  role: string;
  roleNameBn: string;
  roleNameEn: string;
  nameBn: string;
  nameEn: string;
  category: 'citizen' | 'registry' | 'acland' | 'survey' | 'bank' | 'admin' | 'specialist';
  categoryBn: string;
  categoryEn: string;
  officeBn: string;
  color: string;
  descBn: string;
  descEn: string;
}

export const DEMO_CREDENTIALS: DemoCredentialItem[] = [
  // 1. Citizen & Public
  {
    username: 'citizen',
    password: 'demo123',
    role: 'citizen',
    roleNameBn: 'সাধারণ নাগরিক (ক্রেতা/বিক্রেতা)',
    roleNameEn: 'Citizen (Buyer/Seller)',
    nameBn: 'মো. রফিকুল ইসলাম',
    nameEn: 'Md. Rafiqul Islam',
    category: 'citizen',
    categoryBn: 'নাগরিক ও সেবা',
    categoryEn: 'Citizen & Public',
    officeBn: 'নাগরিক পোর্টাল — সাভার, ঢাকা',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descBn: 'জমি কেনাবেচা, নামজারি আবেদন, খতিয়ান তল্লাশি ও ডিজিটাল ভল্ট',
    descEn: 'Land purchase/sale, mutation application, khatian lookup and digital vault',
  },
  {
    username: 'rabeya',
    password: 'demo123',
    role: 'citizen',
    roleNameBn: 'নাগরিক (ওয়ারিশান অংশীদার)',
    roleNameEn: 'Citizen (Heir & Joint Owner)',
    nameBn: 'মোসা. রাবেয়া খাতুন',
    nameEn: 'Mst. Rabeya Khatun',
    category: 'citizen',
    categoryBn: 'নাগরিক ও সেবা',
    categoryEn: 'Citizen & Public',
    officeBn: 'নাগরিক পোর্টাল — বিরুলিয়া, সাভার',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descBn: 'উত্তরাধিকার সূত্রে প্রাপ্ত খতিয়ানের অংশীদার ও আপিলকারী',
    descEn: 'Inherited estate claimant, joint khatian co-owner and appellant',
  },
  {
    username: 'spo_birulia',
    password: 'demo123',
    role: 'service_point_operator',
    roleNameBn: 'সার্ভিস পয়েন্ট অপারেটর (ইউডিসি)',
    roleNameEn: 'Service Point Operator (UDC)',
    nameBn: 'মো. শাহীনুর রহমান',
    nameEn: 'Md. Shahinur Rahman',
    category: 'citizen',
    categoryBn: 'নাগরিক ও সেবা',
    categoryEn: 'Citizen & Public',
    officeBn: 'বিরুলিয়া ইউনিয়ন ডিজিটাল সেন্টার (ইউডিসি)',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    descBn: 'ইউনিয়ন ডিজিটাল সেন্টারে প্রান্তিক নাগরিকদের পক্ষে আবেদন সহায়তা',
    descEn: 'Citizen-assisted land applications and digital services at Union Digital Center',
  },

  // 2. Sub-Registry
  {
    username: 'registrar',
    password: 'demo123',
    role: 'sub_registrar',
    roleNameBn: 'সাব-রেজিস্ট্রার (সাভার)',
    roleNameEn: 'Sub-Registrar (Savar)',
    nameBn: 'ফারহানা ইয়াসমিন',
    nameEn: 'Farhana Yasmin',
    category: 'registry',
    categoryBn: 'সাব-রেজিস্ট্রি',
    categoryEn: 'Sub-Registry',
    officeBn: 'সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    descBn: 'দলিল সম্পাদন, বায়োমেট্রিক গ্রহণ ও রেজিস্ট্রেশন চূড়ান্ত অনুমোদন',
    descEn: 'Deed execution, biometric counter verification and registration sealing',
  },
  {
    username: 'registrar_gazipur',
    password: 'demo123',
    role: 'sub_registrar',
    roleNameBn: 'সাব-রেজিস্ট্রার (গাজীপুর সদর)',
    roleNameEn: 'Sub-Registrar (Gazipur)',
    nameBn: 'মো. শফিকুল আলম',
    nameEn: 'Md. Shafiqul Alam',
    category: 'registry',
    categoryBn: 'সাব-রেজিস্ট্রি',
    categoryEn: 'Sub-Registry',
    officeBn: 'সাব-রেজিস্ট্রি অফিস, গাজীপুর সদর',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    descBn: 'গাজীপুর আঞ্চলিক সাব-রেজিস্ট্রি দলিলের আইনগত তত্ত্বাবধান',
    descEn: 'Gazipur regional registry supervision and jurisdiction enforcement',
  },
  {
    username: 'rdo_savar',
    password: 'demo123',
    role: 'registry_data_officer',
    roleNameBn: 'রেজিস্ট্রি ডাটা অফিসার (মেকার)',
    roleNameEn: 'Registry Data Officer (Maker)',
    nameBn: 'মো. কামরুল হাসান',
    nameEn: 'Md. Kamrul Hasan',
    category: 'registry',
    categoryBn: 'সাব-রেজিস্ট্রি',
    categoryEn: 'Sub-Registry',
    officeBn: 'সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    descBn: 'দলিলের তথ্যাবলি যাচাই, স্ক্যানিং ও খসড়া ভেরিফিকেশন প্রস্তুত',
    descEn: 'Deed metadata entry, deed scanning and initial verification queuing',
  },

  // 3. Land Administration & AC Land
  {
    username: 'acland',
    password: 'demo123',
    role: 'ac_land',
    roleNameBn: 'সহকারী কমিশনার - ভূমি (এসি ল্যান্ড)',
    roleNameEn: 'Assistant Commissioner - Land (AC Land)',
    nameBn: 'তানভীর আহমেদ',
    nameEn: 'Tanvir Ahmed',
    category: 'acland',
    categoryBn: 'ভূমি রাজস্ব ও এসি ল্যান্ড',
    categoryEn: 'Land Admin & AC Land',
    officeBn: 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    descBn: 'ই-নামজারি (Mutation) অনুমোদন, খতিয়ান সৃষ্টি ও ভূমি বিরোধ নিষ্পত্তি',
    descEn: 'E-Mutation approval, corrected khatian issuance and dispute hearings',
  },
  {
    username: 'loa_savar',
    password: 'demo123',
    role: 'land_office_assistant',
    roleNameBn: 'ভূমি অফিস সহকারী (মেকার)',
    roleNameEn: 'Land Office Assistant (Maker)',
    nameBn: 'সালমা আক্তার',
    nameEn: 'Salma Akter',
    category: 'acland',
    categoryBn: 'ভূমি রাজস্ব ও এসি ল্যান্ড',
    categoryEn: 'Land Admin & AC Land',
    officeBn: 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    descBn: 'নামজারি আবেদন যাচাই ও প্রাথমিক প্রস্তাবনা তৈরি',
    descEn: 'Mutation docket review, registry deed match check and proposal drafting',
  },
  {
    username: 'fvo_savar',
    password: 'demo123',
    role: 'field_verification_officer',
    roleNameBn: 'ফিল্ড ভেরিফিকেশন অফিসার (এফভিও)',
    roleNameEn: 'Field Verification Officer (FVO)',
    nameBn: 'মো. জাহাঙ্গীর আলম',
    nameEn: 'Md. Jahangir Alam',
    category: 'acland',
    categoryBn: 'ভূমি রাজস্ব ও এসি ল্যান্ড',
    categoryEn: 'Land Admin & AC Land',
    officeBn: 'ইউনিয়ন ভূমি অফিস, বিরুলিয়া, সাভার',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    descBn: 'সরেজমিন জমি দখল, সীমানা পিলার ও ভূমি উন্নয়ন কর যাচাই প্রতিবেদন',
    descEn: 'On-site physical possession, boundary demarcation and land tax inspection report',
  },

  // 4. Survey & Settlement
  {
    username: 'sro_dhaka',
    password: 'demo123',
    role: 'settlement_records_officer',
    roleNameBn: 'সেটেলমেন্ট রেকর্ডস অফিসার (মেকার)',
    roleNameEn: 'Settlement Records Officer (Maker)',
    nameBn: 'মো. দেলোয়ার হোসেন',
    nameEn: 'Md. Delwar Hossain',
    category: 'survey',
    categoryBn: 'জরিপ ও সেটেলমেন্ট',
    categoryEn: 'Survey & Settlement',
    officeBn: 'জোনাল সেটেলমেন্ট অফিস, ঢাকা',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    descBn: 'নতুন জরিপ ও সিএস/এসএ/আরএস/বিএস রেকর্ড অনবোর্ডিং ব্যাচ তৈরি ও সংশোধন',
    descEn: 'Historical and digital survey onboarding batch creation and correction',
  },
  {
    username: 'aso_dhaka',
    password: 'demo123',
    role: 'settlement_checker',
    roleNameBn: 'সহকারী সেটেলমেন্ট অফিসার (চেকার)',
    roleNameEn: 'Assistant Settlement Officer (Checker)',
    nameBn: 'নাজনীন সুলতানা',
    nameEn: 'Nazneen Sultana',
    category: 'survey',
    categoryBn: 'জরিপ ও সেটেলমেন্ট',
    categoryEn: 'Survey & Settlement',
    officeBn: 'জোনাল সেটেলমেন্ট অফিস, ঢাকা',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    descBn: 'অনবোর্ডিং খসড়া রেকর্ড যাচাই, রিটার্ন বা চূড়ান্ত লেজারে প্রকাশ অনুমোদন',
    descEn: 'Survey batch quality check, return with notes or seal into canonical ledger',
  },

  // 5. Oversight & Appeals
  {
    username: 'uno_savar',
    password: 'demo123',
    role: 'uno_supervisor',
    roleNameBn: 'উপজেলা নির্বাহী কর্মকর্তা (ইউএনও)',
    roleNameEn: 'Upazila Nirbahi Officer (UNO)',
    nameBn: 'মো. মশিউর রহমান',
    nameEn: 'Md. Mashiur Rahman',
    category: 'acland',
    categoryBn: 'তদারকি ও আপিল',
    categoryEn: 'Oversight & Appeals',
    officeBn: 'উপজেলা নির্বাহী অফিসারের কার্যালয়, সাভার',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    descBn: 'উপজেলা পর্যায়ে এসএলএ তদারকি, ভূমি সেবা গতিশীলতা ও ডিসপ্যাচ',
    descEn: 'Upazila SLA governance, inter-agency escalation and dispatch alerts',
  },
  {
    username: 'appellate_reviewer',
    password: 'demo123',
    role: 'appellate_reviewer',
    roleNameBn: 'অতিরিক্ত জেলা প্রশাসক - রাজস্ব (এডিসি)',
    roleNameEn: 'ADC Revenue (Appellate Reviewer)',
    nameBn: 'মো. সাইদুর রহমান',
    nameEn: 'Md. Saidur Rahman',
    category: 'acland',
    categoryBn: 'তদারকি ও আপিল',
    categoryEn: 'Oversight & Appeals',
    officeBn: 'জেলা প্রশাসকের কার্যালয় (রাজস্ব শাখা), ঢাকা',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    descBn: 'এসি ল্যান্ডের নামজারি আদেশের বিরুদ্ধে দায়েরকৃত মিস-কেস ও আপিল নিষ্পত্তি',
    descEn: 'Statutory mutation appeal review, hearing scheduling and appellate judgment',
  },

  // 6. Bank & Mortgage
  {
    username: 'bank',
    password: 'demo123',
    role: 'bank_officer',
    roleNameBn: 'ব্যাংক কর্মকর্তা (ঋণ ও বন্ধক শাখা)',
    roleNameEn: 'Bank Officer (Credit & Mortgage)',
    nameBn: 'নাজমুল হাসান',
    nameEn: 'Nazmul Hasan',
    category: 'bank',
    categoryBn: 'ব্যাংক ও বন্ধক',
    categoryEn: 'Bank & Mortgage',
    officeBn: 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    descBn: 'জমির লিয়েন মার্কিং, বন্ধক নিবন্ধন ও এনওসি যাচাইকরণ',
    descEn: 'Plot mortgage lien marking, encumbrance verification and NOC review',
  },
  {
    username: 'bank_manager',
    password: 'demo123',
    role: 'bank_manager',
    roleNameBn: 'শাখা ব্যবস্থাপক (ব্যাংক)',
    roleNameEn: 'Bank Branch Manager',
    nameBn: 'সৈয়দা খালেদা পারভীন',
    nameEn: 'Syeda Khaleda Parveen',
    category: 'bank',
    categoryBn: 'ব্যাংক ও বন্ধক',
    categoryEn: 'Bank & Mortgage',
    officeBn: 'সোনালী ব্যাংক পিএলসি, সাভার শাখা',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    descBn: 'ঋণ পরিশোধ সাপেক্ষে জমির বন্ধক অবমুক্তি (Lien Release) অনুমোদন',
    descEn: 'Mortgage loan clearance approval and official lien release issuance',
  },

  // 7. Central Administration & Audit
  {
    username: 'admin',
    password: 'demo123',
    role: 'admin',
    roleNameBn: 'সুপার অ্যাডমিন (সিস্টেম গভর্নর)',
    roleNameEn: 'Super Admin (System Governor)',
    nameBn: 'ভূমি সুরক্ষা অ্যাডমিন',
    nameEn: 'BhumiShield System Admin',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'কেন্দ্রীয় সিস্টেম গভর্ন্যান্স ও কনফিগারেশন সেল',
    color: 'bg-red-100 text-red-800 border-red-300',
    descBn: 'কর্মকর্তা বদলি, অফিস লাইফসাইকেল, জাতীয় সুরক্ষা পলিসি ও জরুরি হস্তক্ষেপ',
    descEn: 'Staff transfers, national offices lifecycle, emergency freeze and system controls',
  },
  {
    username: 'lead_auditor',
    password: 'demo123',
    role: 'auditor',
    roleNameBn: 'জাতীয় ক্রিপ্টোগ্রাফিক অডিটর',
    roleNameEn: 'National Cryptographic Auditor',
    nameBn: 'মো. শামসুল হক',
    nameEn: 'Md. Shamsul Haque',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'জাতীয় ভূমি লেজার অডিট অধিদপ্তর',
    color: 'bg-red-100 text-red-800 border-red-300',
    descBn: 'ব্লকচেইন হ্যাশ-চেইন অখণ্ডতা, রেকর্ড বিকৃতি ও অডিট ট্রেইল নিরীক্ষা',
    descEn: 'Cryptographic hash chain verification, ledger tampering detection and forensic audit',
  },
  {
    username: 'support_agent',
    password: 'demo123',
    role: 'support_agent',
    roleNameBn: 'সাপোর্ট এজেন্ট (১৬১২২)',
    roleNameEn: 'Support Agent (16122)',
    nameBn: 'মোসা. ফারহানা আফরোজ',
    nameEn: 'Mst. Farhana Afroz',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'ভূমি সেবা হেল্পলাইন কলসেন্টার ১৬১২২',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    descBn: 'নাগরিক টিকিট হ্যান্ডলিং, রেকর্ড ক্লেইম রেফারেল ও জরুরি সহায়তা',
    descEn: 'Citizen helpline 16122 tickets, land record claims and desk triage',
  },
  {
    username: 'platform_moderator',
    password: 'demo123',
    role: 'platform_moderator',
    roleNameBn: 'প্ল্যাটফর্ম মডারেটর',
    roleNameEn: 'Platform Moderator',
    nameBn: 'মো. ফাহিম চৌধুরী',
    nameEn: 'Md. Fahim Chowdhury',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'ভূমি সুরক্ষা মার্কেটপ্লেস ও লিস্টিং সেল',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    descBn: 'পাবলিক জমি লিস্টিং যাচাই, সন্দেহজনক বিজ্ঞাপন বাতিল ও নিয়ন্ত্রণ',
    descEn: 'Public marketplace land listing verification, scam detection and takedowns',
  },
  {
    username: 'content_editor',
    password: 'demo123',
    role: 'content_editor',
    roleNameBn: 'কনটেন্ট এডিটর (মেকার)',
    roleNameEn: 'Content Editor (Maker)',
    nameBn: 'তানজিলা হক',
    nameEn: 'Tanjila Haque',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'ভূমি প্রকাশনা ও জনসচেতনতা শাখা',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descBn: 'জনসাধারণের জন্য নোটিশ, পরিপত্র ও নির্দেশিকা খসড়া প্রস্তুত',
    descEn: 'Public citizen circulars, notices and guidance draft authoring',
  },
  {
    username: 'content_approver',
    password: 'demo123',
    role: 'content_approver',
    roleNameBn: 'কনটেন্ট অ্যাপ্রুভার (চেকার)',
    roleNameEn: 'Content Approver (Checker)',
    nameBn: 'মো. আতিকুল ইসলাম',
    nameEn: 'Md. Atiqul Islam',
    category: 'admin',
    categoryBn: 'প্রশাসন ও অডিট',
    categoryEn: 'Admin & Audit',
    officeBn: 'ভূমি মন্ত্রণালয় জনসংযোগ উইং',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    descBn: 'খসড়া নোটিশ পর্যালোচনা ও অফিসিয়াল নোটিশবোর্ডে চূড়ান্ত প্রকাশ',
    descEn: 'Official circular vetting and public noticeboard publication approval',
  },

  // 8. Specialist & Legal
  {
    username: 'dc_la',
    password: 'demo123',
    role: 'dc_acquisition_officer',
    roleNameBn: 'এলএ কর্মকর্তা (ভূমি অধিগ্রহণ)',
    roleNameEn: 'LA Officer (Land Acquisition)',
    nameBn: 'মো. তারেক হাসান',
    nameEn: 'Md. Tariq Hasan',
    category: 'specialist',
    categoryBn: 'স্পেশালিস্ট ও আইন',
    categoryEn: 'Specialist & Legal',
    officeBn: 'জেলা প্রশাসকের কার্যালয় (ভূমি অধিগ্রহণ শাখা)',
    color: 'bg-violet-100 text-violet-800 border-violet-300',
    descBn: 'সরকারি প্রকল্প ও জাতীয় অবকাঠামোতে ৪ ধারা ভূমি অধিগ্রহণ প্রজ্ঞাপন',
    descEn: 'Section 4 public acquisition notices, national infrastructure encumbrance',
  },
  {
    username: 'lawyer',
    password: 'demo123',
    role: 'lawyer_court_user',
    roleNameBn: 'দেওয়ানি আদালত প্রতিনিধি (আইনজীবী)',
    roleNameEn: 'Civil Court Representative (Lawyer)',
    nameBn: 'এডভোকেট সিরাজুল করিম',
    nameEn: 'Advocate Sirajul Karim',
    category: 'specialist',
    categoryBn: 'স্পেশালিস্ট ও আইন',
    categoryEn: 'Specialist & Legal',
    officeBn: 'ঢাকা জেলা ও দায়রা জজ আদালত বার',
    color: 'bg-violet-100 text-violet-800 border-violet-300',
    descBn: 'আদালতের নিষেধাজ্ঞার প্রজ্ঞাপন ও স্থগিতাদেশ (Injunction) নিবন্ধন',
    descEn: 'Civil court injunction filing, litigation notice and plot freeze recording',
  },
];

export interface FastEvaluatorRole {
  roleKey: string;
  username: string;
  nameBn: string;
  nameEn: string;
  titleBn: string;
  titleEn: string;
  dot: string;
}

export const FAST_EVALUATOR_ROLES: FastEvaluatorRole[] = [
  {
    roleKey: 'citizen',
    username: 'citizen',
    nameBn: 'নাগরিক',
    nameEn: 'Citizen',
    titleBn: 'মো. রফিকুল ইসলাম',
    titleEn: 'Md. Rafiqul Islam',
    dot: 'bg-emerald-500',
  },
  {
    roleKey: 'sub_registrar',
    username: 'registrar',
    nameBn: 'সাব-রেজিস্ট্রার',
    nameEn: 'Sub-Registrar',
    titleBn: 'ফারহানা ইয়াসমিন (সাব-রেজিস্ট্রার)',
    titleEn: 'Farhana Yasmin (Sub-Registrar)',
    dot: 'bg-blue-500',
  },
  {
    roleKey: 'ac_land',
    username: 'acland',
    nameBn: 'এসি ল্যান্ড',
    nameEn: 'AC Land',
    titleBn: 'তানভীর আহমেদ (এসি ল্যান্ড)',
    titleEn: 'Tanvir Ahmed (AC Land)',
    dot: 'bg-amber-500',
  },
  {
    roleKey: 'bank_officer',
    username: 'bank',
    nameBn: 'ব্যাংক অফিসার',
    nameEn: 'Bank Officer',
    titleBn: 'নাজমুল হাসান (সোনালী ব্যাংক)',
    titleEn: 'Nazmul Hasan (Sonali Bank)',
    dot: 'bg-rose-500',
  },
  {
    roleKey: 'lawyer_court_user',
    username: 'lawyer',
    nameBn: 'আইনজীবী / আদালত',
    nameEn: 'Court Lawyer',
    titleBn: 'এডভোকেট সিরাজুল করিম',
    titleEn: 'Advocate Sirajul Karim',
    dot: 'bg-violet-500',
  },
  {
    roleKey: 'admin',
    username: 'admin',
    nameBn: 'সুপার অ্যাডমিন',
    nameEn: 'Super Admin',
    titleBn: 'ভূমি সুরক্ষা অ্যাডমিন',
    titleEn: 'BhumiShield Admin',
    dot: 'bg-red-500',
  },
];

export const AuthPage: React.FC<{
  mode?: 'login' | 'profile';
  onSuccessNavigate: (tab: string) => void;
}> = ({ mode = 'login', onSuccessNavigate }) => {
  const { lang, user, setUser, setToken, t } = useAppUI();
  const [tab, setTab] = useState<'login' | 'register' | 'profile'>(
    user && mode === 'profile' ? 'profile' : 'login'
  );

  const isDemoMode = import.meta.env.DEV;
  const [username, setUsername] = useState(isDemoMode ? 'citizen' : '');
  const [password, setPassword] = useState(isDemoMode ? 'demo123' : '');
  const [showPassword, setShowPassword] = useState(false);

  // Fast Fill & Feedback
  const [credentialToast, setCredentialToast] = useState<{ username: string; roleName: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [credSearch, setCredSearch] = useState<string>('');

  const fillAndCopy = (cred: DemoCredentialItem, autoLogin = false) => {
    setUsername(cred.username);
    setPassword(cred.password);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(cred.username);
      }
    } catch {
      // ignore clipboard error
    }

    setCredentialToast({
      username: cred.username,
      roleName: lang === 'bn' ? cred.roleNameBn : cred.roleNameEn,
    });

    setTimeout(() => {
      setCredentialToast(null);
    }, 4500);

    if (autoLogin) {
      handleLogin(cred.username, cred.password);
    }
  };

  // Registration state
  const [regMethod, setRegMethod] = useState<'phone' | 'email'>('phone');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState(isDemoMode ? 'demo123' : '');
  const [regNameBn, setRegNameBn] = useState('');
  const [regNameEn, setRegNameEn] = useState('');
  const [regNid, setRegNid] = useState(isDemoMode ? '9900001099' : '');
  const [regPhone, setRegPhone] = useState(isDemoMode ? '01700-000999' : '');
  const [regEmail, setRegEmail] = useState('');
  const [regOffice, setRegOffice] = useState('ঢাকা, বাংলাদেশ');
  const [regPendingNotice, setRegPendingNotice] = useState<any | null>(null);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationTargetNid, setVerificationTargetNid] = useState('');

  // Profile update state
  const [profNameBn, setProfNameBn] = useState(user?.full_name_bn || '');
  const [profNameEn, setProfNameEn] = useState(user?.full_name_en || '');
  const [profPhone, setProfPhone] = useState(user?.phone_mock || '');
  const [profNid, setProfNid] = useState(user?.nid || '');
  const [profOffice, setProfOffice] = useState(user?.office_name || '');
  const [profNewPass, setProfNewPass] = useState('');
  const [profCurrentPass, setProfCurrentPass] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleLogin = async (u = username, p = password) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await BhumiApi.login(u.trim(), p);
      if (res?.access_token && res?.user) {
        setToken(res.access_token);
        setUser(res.user);
        setSuccessMsg(t('সফলভাবে পরিচয় নিশ্চিত হয়েছে!', 'Signed in successfully!'));
        setTimeout(() => {
          onSuccessNavigate(ROLE_ROUTE[res.user.role as UserRole] || 'home');
        }, 200);
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('লগইন ব্যর্থ হয়েছে। আপনার ইউজারনেম ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।', 'Sign in failed. Please verify credentials.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const payload: any = {
        username: regUsername.trim(),
        password: regPassword,
        full_name_bn: regNameBn.trim(),
        full_name_en: regNameEn.trim() || regNameBn.trim(),
        role: 'citizen',
        registration_channel: regMethod,
        nid: regNid.trim(),
        office_bn: regOffice.trim(),
      };
      if (regMethod === 'phone') {
        payload.phone_dummy = regPhone.trim();
        if (regEmail.trim()) payload.email = regEmail.trim();
      } else {
        payload.email = regEmail.trim();
        if (regPhone.trim()) payload.phone_dummy = regPhone.trim();
      }

      const res = await BhumiApi.register(payload);
      if (res.user && Number(res.user.is_identity_verified) === 0) {
        setRegPendingNotice(res.user);
        setUsername(res.user.username);
        setSuccessMsg(
          lang === 'bn'
            ? 'নাগরিক নিবন্ধন সফল হয়েছে! আপনার অ্যাকাউন্টটি বর্তমানে সুপার অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।'
            : 'Registration submitted! Your citizen account is pending Super Admin approval.'
        );
      } else {
        setToken(res.access_token);
        setUser(res.user);
        onSuccessNavigate('home');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMsg(
        detail
          ? lang === 'bn'
            ? detail.message_bn
            : detail.message_en
          : t('নিবন্ধন ব্যর্থ হয়েছে। সঠিক তথ্য প্রদান করুন।', 'Registration failed. Please check inputs.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await BhumiApi.updateProfile({
        full_name_bn: profNameBn,
        full_name_en: profNameEn,
        phone_mock: profPhone,
        nid: profNid.trim() || undefined,
        ...(user?.role === 'admin' ? { office_name: profOffice } : {}),
        current_password: profNewPass ? profCurrentPass : undefined,
        new_password: profNewPass || undefined,
      });
      setUser(res.user);
      setSuccessMsg(t('প্রোফাইল সফলভাবে আপডেট হয়েছে।', 'Profile updated.'));
    } catch {
      setErrorMsg(t('প্রোফাইল আপডেট করতে সমস্যা হয়েছে।', 'Failed to update profile.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl xl:max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
      {/* Main Split-Screen Container with Real Generated Visual Asset */}
      <div className="rounded-3xl border border-slate-200/90 shadow-xl bg-white overflow-hidden grid grid-cols-1 xl:grid-cols-12 min-h-[580px]">
        
        {/* Left Column: Visual Showcase (Strictly Hidden on Mobiles & Tablets, Visible ONLY on Desktop >= 1280px) */}
        <div className="hidden xl:flex xl:col-span-5 bg-gradient-to-br from-[#003829] via-[#004e38] to-[#01281e] text-white p-7 sm:p-9 flex-col justify-between relative overflow-hidden">
          {/* Real Background Artwork Layer */}
          <div className="absolute inset-0 z-0">
            <img
              src={tab === 'register' ? '/assets/auth-deed-showcase.png' : '/assets/auth-showcase.png'}
              alt="BhumiShield Digital Land Security"
              className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#01241a] via-[#003d2e]/80 to-[#002e22]/85" />
          </div>

          {/* Top Brand Header */}
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-emerald-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>{t('জাতীয় ডিজিটাল ভূমি ব্যবস্থাপনা', 'National Digital Land Ledger')}</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
              {t('স্মার্ট ভূমিসেবা ও নাগরিক সুরক্ষা ভল্ট', 'Smart Land Services & Citizen Protection')}
            </h1>
            
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
              {t(
                'বায়োমেট্রিক ও এনআইডি সংযুক্তির মাধ্যমে জালিয়াতিমুক্ত জমি ক্রয়-বিক্রয় এবং তাৎক্ষণিক খতিয়ান ভল্ট।',
                'Fraud-proof land transactions and instant title verification powered by biometrics and cryptographic ledger.'
              )}
            </p>
          </div>

          {/* Middle: Real Generated Image Card Showcase */}
          <div className="relative z-10 my-6">
            <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/25 backdrop-blur-md p-2">
              <img
                src="/assets/citizen-vault-smartcard.png"
                alt={t('ডিজিটাল নাগরিক স্মার্টকার্ড', 'Citizen Land Vault Smartcard')}
                className="w-full h-auto object-cover rounded-xl shadow-md"
              />
            </div>
          </div>

          {/* Bottom Security Guarantees */}
          <div className="relative z-10 space-y-2.5 text-xs text-emerald-100/90 border-t border-white/15 pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('Ed25519 ক্রিপ্টোগ্রাফিক ডিজিটাল স্বাক্ষরযুক্ত দলিল', 'Ed25519 Asymmetrically Signed Deeds')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('সাব-রেজিস্ট্রি থেকে এসি ল্যান্ডে সরাসরি অটো-মিউটেশন', 'Zero-friction Sub-Registry to AC Land Mutation')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t('মালিকের সম্মতি ছাড়া বিক্রি লক সুরক্ষা (Smart Lock)', 'Owner Consent Enforced Plot Sale Lock')}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Clean shadcn/ui Login & Registration */}
        <div className="col-span-1 xl:col-span-7 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            
            {/* Header with Title and Mode Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {tab === 'login'
                    ? t('অ্যাকাউন্টে প্রবেশ করুন', 'Sign In to Workspace')
                    : tab === 'register'
                    ? t('নাগরিক অ্যাকাউন্ট নিবন্ধন', 'Citizen Registration')
                    : t('আমার প্রোফাইল', 'My Profile')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {tab === 'login'
                    ? t('নাগরিক বা অনুমোদিত কর্মকর্তা ক্রেডেনশিয়াল দিন', 'Enter citizen or authorized officer credentials')
                    : t('আপনার জাতীয় পরিচয়পত্র দিয়ে সেবা গ্রহণ করুন', 'Access land services with your verified NID')}
                </p>
              </div>

              {/* Mode Tabs */}
              <Tabs value={tab} onValueChange={(val) => setTab(val as any)} className="w-auto">
                <TabsList className="bg-slate-100 p-1 rounded-xl h-auto">
                  <TabsTrigger
                    value="login"
                    className="text-xs font-bold py-2 px-3.5 rounded-lg data-[state=active]:bg-[#006A4E] data-[state=active]:text-white shadow-2xs"
                  >
                    <LogIn className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('লগইন', 'Sign In')}</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="text-xs font-bold py-2 px-3.5 rounded-lg data-[state=active]:bg-[#006A4E] data-[state=active]:text-white shadow-2xs"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    <span>{t('নিবন্ধন', 'Register')}</span>
                  </TabsTrigger>
                  {user && (
                    <TabsTrigger
                      value="profile"
                      className="text-xs font-bold py-2 px-3.5 rounded-lg data-[state=active]:bg-[#006A4E] data-[state=active]:text-white shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                      <span>{t('প্রোফাইল', 'Profile')}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>

            {/* Error / Success Alerts */}
            {errorMsg && (
              <Alert variant="destructive" className="py-3 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <AlertDescription className="font-bold">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="py-3 border-emerald-200 bg-emerald-50 text-emerald-900 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <AlertDescription className="font-bold text-emerald-900">{successMsg}</AlertDescription>
              </Alert>
            )}

            {/* TAB 1: LOGIN FORM */}
            {tab === 'login' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLogin();
                }}
                className="space-y-4 pt-1"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="auth-username" className="text-xs font-bold text-slate-700">
                    {t('ইউজারনেম / ইমেইল / মোবাইল নম্বর', 'Username / Email / Mobile Phone')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="auth-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('যেমন: citizen, registrar, acland', 'e.g. citizen, registrar, acland')}
                      className="w-full pl-10 h-11 text-sm font-semibold rounded-xl border-slate-300 focus:border-[#006A4E]"
                      required
                    />
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auth-password" className="text-xs font-bold text-slate-700">
                      {t('পাসওয়ার্ড', 'Password')}
                    </Label>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {isDemoMode && 'Demo: demo123'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 h-11 text-sm font-semibold rounded-xl border-slate-300 focus:border-[#006A4E]"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1.5 top-1.5 h-8 w-8 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm shadow-md transition"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  <span>{loading ? t('যাচাই হচ্ছে...', 'Verifying...') : t('পোর্টালে প্রবেশ করুন →', 'Sign In to Workspace →')}</span>
                </Button>

                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500">
                    {t('কোনো অ্যাকাউন্ট নেই? ', "Don't have an account? ")}
                  </span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setTab('register')}
                    className="text-xs font-bold text-[#006A4E] p-0 h-auto"
                  >
                    {t('নাগরিক নিবন্ধন করুন', 'Register as Citizen')}
                  </Button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER FORM */}
            {tab === 'register' && (
              <div className="space-y-4">
                {regPendingNotice ? (
                  <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <h3 className="text-base font-extrabold text-amber-900">
                          {t('নাগরিক নিবন্ধন সফল — সুপার অ্যাডমিন অনুমোদনের অপেক্ষায়', 'Registration Submitted — Pending Super Admin Approval')}
                        </h3>
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          {t(
                            'জাতীয় নিরাপত্তার স্বার্থে নাগরিক প্রোফাইল যাচাইকরণের পর অ্যাকাউন্টটি সক্রিয় হবে। তাৎক্ষণিক আনলক করতে এনআইডি ও বায়োমেট্রিক সম্পন্ন করুন।',
                            'Citizen profiles require verification. You can also complete biometric verification now.'
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setVerificationTargetNid(regPendingNotice.nid || '');
                          setIsVerificationModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>{t('এনআইডি ও বায়োমেট্রিক এখনই যাচাই করুন', 'Verify NID & Biometrics Now')}</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setRegPendingNotice(null);
                          setTab('login');
                        }}
                        className="bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs"
                      >
                        {t('লগইন স্ক্রিনে যান', 'Go to Sign In')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {/* Method Switcher */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <Button
                        type="button"
                        variant={regMethod === 'phone' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setRegMethod('phone')}
                        className={`font-bold text-xs gap-1.5 ${
                          regMethod === 'phone'
                            ? 'bg-[#006A4E] text-white hover:bg-[#00523C]'
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{t('মোবাইল নম্বর', 'Mobile Number')}</span>
                      </Button>
                      <Button
                        type="button"
                        variant={regMethod === 'email' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setRegMethod('email')}
                        className={`font-bold text-xs gap-1.5 ${
                          regMethod === 'email'
                            ? 'bg-[#006A4E] text-white hover:bg-[#00523C]'
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{t('ইমেইল ঠিকানা', 'Email Address')}</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('পূর্ণ নাম (বাংলা)', 'Full Name (Bangla)')}</Label>
                        <Input
                          value={regNameBn}
                          onChange={(e) => setRegNameBn(e.target.value)}
                          placeholder={t('যেমন: মো. রফিকুল ইসলাম', 'e.g. Md. Rafiqul Islam')}
                          className="h-10 text-xs rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('পূর্ণ নাম (English)', 'Full Name (English)')}</Label>
                        <Input
                          value={regNameEn}
                          onChange={(e) => setRegNameEn(e.target.value)}
                          placeholder="e.g. Md. Rafiqul Islam"
                          className="h-10 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('পছন্দের ইউজারনেম', 'Desired Username')}</Label>
                        <Input
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="e.g. rafiqul26"
                          className="h-10 text-xs font-mono rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('জাতীয় পরিচয়পত্র নম্বর (NID)', 'NID Number')}</Label>
                        <Input
                          value={regNid}
                          onChange={(e) => setRegNid(e.target.value)}
                          placeholder={t('১০ বা ১৭ ডিজিটের এনআইডি', '10 or 17 digit NID')}
                          className="h-10 text-xs font-mono rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    {regMethod === 'phone' ? (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('সক্রিয় মোবাইল নম্বর', 'Active Mobile Number')}</Label>
                        <Input
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="01700-000000"
                          className="h-10 text-xs font-mono rounded-xl"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700">{t('সক্রিয় ইমেইল ঠিকানা', 'Active Email Address')}</Label>
                        <Input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="h-10 text-xs font-mono rounded-xl"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700">{t('গোপনীয় পাসওয়ার্ড', 'Set Password')}</Label>
                      <Input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 text-xs font-mono rounded-xl"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm shadow-md"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      <span>{loading ? t('নিবন্ধন হচ্ছে...', 'Submitting...') : t('নাগরিক অ্যাকাউন্ট তৈরি করুন', 'Create Citizen Account')}</span>
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: PROFILE FORM */}
            {tab === 'profile' && user && (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-950">{user.full_name_bn || (user as any).name || user.username}</div>
                    <div className="text-[11px] text-emerald-800 font-mono">Role: {user.role} | Office: {user.office_name}</div>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-xs">{t('সক্রিয়', 'Active')}</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">{t('নাম (বাংলা)', 'Name (Bangla)')}</Label>
                    <Input value={profNameBn} onChange={(e) => setProfNameBn(e.target.value)} className="h-10 text-xs rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">{t('নাম (English)', 'Name (English)')}</Label>
                    <Input value={profNameEn} onChange={(e) => setProfNameEn(e.target.value)} className="h-10 text-xs rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">{t('মোবাইল নম্বর', 'Phone')}</Label>
                    <Input value={profPhone} onChange={(e) => setProfPhone(e.target.value)} className="h-10 text-xs font-mono rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">{t('এনআইডি', 'NID')}</Label>
                    <Input value={profNid} onChange={(e) => setProfNid(e.target.value)} className="h-10 text-xs font-mono rounded-xl" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-10 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs"
                  >
                    <span>{loading ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('প্রোফাইল আপডেট করুন', 'Save Profile')}</span>
                  </Button>
                </div>
              </form>
            )}

          </div>

          {/* Clean Expandable Demo Credentials Directory (22+ Roles) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="demo-directory" className="border-none">
                <AccordionTrigger className="text-xs font-bold text-slate-700 hover:text-slate-900 py-2 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('সকল ২২টি প্রাতিষ্ঠানিক ও নাগরিক ডেমো ভূমিকা (Demo Directory)', 'All 22+ Demo Roles Directory')}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 space-y-3">
                  {/* Category Filter Chips */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {[
                      { id: 'all', bn: 'সব ভূমিকা (২২)', en: 'All Roles (22)' },
                      { id: 'citizen', bn: 'নাগরিক ও সেবা', en: 'Citizen' },
                      { id: 'registry', bn: 'সাব-রেজিস্ট্রি', en: 'Registry' },
                      { id: 'acland', bn: 'এসি ল্যান্ড ও রাজস্ব', en: 'AC Land' },
                      { id: 'bank', bn: 'ব্যাংক ও বন্ধক', en: 'Bank' },
                      { id: 'admin', bn: 'প্রশাসন ও অডিট', en: 'Admin' },
                      { id: 'specialist', bn: 'আদালত ও স্পেশালিস্ট', en: 'Legal' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          selectedCategory === cat.id
                            ? 'bg-[#006A4E] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {lang === 'bn' ? cat.bn : cat.en}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Input
                      value={credSearch}
                      onChange={(e) => setCredSearch(e.target.value)}
                      placeholder={t('নাম বা পদবি দিয়ে খুঁজুন...', 'Search demo accounts...')}
                      className="h-8 text-xs pl-8 rounded-lg"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Credentials List (Compact) */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {DEMO_CREDENTIALS.filter((c) => {
                      const matchCat = selectedCategory === 'all' || c.category === selectedCategory;
                      const q = credSearch.trim().toLowerCase();
                      if (!q) return matchCat;
                      return (
                        matchCat &&
                        (c.username.toLowerCase().includes(q) ||
                          c.roleNameBn.toLowerCase().includes(q) ||
                          c.nameBn.toLowerCase().includes(q) ||
                          c.roleNameEn.toLowerCase().includes(q))
                      );
                    }).map((cred) => (
                      <div
                        key={cred.username}
                        className="p-2 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-50 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {lang === 'bn' ? cred.nameBn : cred.nameEn}
                            </span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-slate-300">
                              @{cred.username}
                            </Badge>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {lang === 'bn' ? cred.roleNameBn : cred.roleNameEn} · {cred.officeBn}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fillAndCopy(cred, false)}
                            className="h-6 px-2 text-[10px] font-bold border-slate-300"
                          >
                            {t('পূরণ', 'Fill')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fillAndCopy(cred, true)}
                            className="h-6 px-2 text-[10px] font-bold bg-[#006A4E] hover:bg-[#00553e] text-white"
                          >
                            {t('লগইন', 'Login')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

        </div>

      </div>

      {/* Citizen Verification Modal */}
      {isVerificationModalOpen && (
        <CitizenVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={() => setIsVerificationModalOpen(false)}
          initialNid={verificationTargetNid}
          onSuccess={() => {
            setIsVerificationModalOpen(false);
            setSuccessMsg(t('নাগরিক পরিচয় সফলভাবে বায়োমেট্রিক দ্বারা নিশ্চিত হয়েছে!', 'Identity verified with biometrics!'));
          }}
        />
      )}
    </div>
  );
};