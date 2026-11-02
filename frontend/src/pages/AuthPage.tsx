import React, { useState } from 'react';
import { useAppUI, UserRole } from '../i18n';
import { BhumiApi } from '../api/client';
import { CitizenVerificationModal } from '../components/CitizenVerificationModal';
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
  AlertCircle,
  HelpCircle,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Search,
  ArrowUp,
  User,
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
    titleBn: 'মো. রফিকুল ইসলাম (নাগরিক)',
    titleEn: 'Md. Rafiqul Islam (Citizen)',
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

  // Demo credentials directory state & copy helper
  const [copiedUser, setCopiedUser] = useState<string | null>(null);
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

    setCopiedUser(cred.username);
    setCredentialToast({
      username: cred.username,
      roleName: lang === 'bn' ? cred.roleNameBn : cred.roleNameEn,
    });

    setTimeout(() => {
      setCopiedUser((prev) => (prev === cred.username ? null : prev));
    }, 2500);

    setTimeout(() => {
      setCredentialToast(null);
    }, 6000);

    if (autoLogin) {
      handleLogin(cred.username, cred.password);
    } else {
      const formElem = document.getElementById('login-form-card');
      if (formElem) {
        formElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Registration state - supports both Phone and Email
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
        }, 250);
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Government Platform Header */}
      <div className="text-center space-y-2 mb-2">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#006A4E] text-white text-xl font-bold ring-4 ring-emerald-100 shadow-sm mx-auto">
          <span>ভূ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('ভূমি সুরক্ষা গেটওয়ে', 'BhumiShield Account Sign-In')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          {t('স্বাধীন ভূমি রেকর্ড ও যাচাই অ্যাপ্লিকেশন', 'Independent land-record workflow and verification application')}
        </p>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4 mb-6">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
              tab === 'login' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{t('নিরাপদ সাইন-ইন (Sign In)', 'Sign In')}</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
              tab === 'register' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('নাগরিক নিবন্ধন (Citizen Register)', 'Citizen Register')}</span>
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setTab('profile')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition min-h-[38px] ${
                tab === 'profile' ? 'bg-[#006A4E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>{t('আমার প্রোফাইল', 'My Profile')}</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-red-50 border border-red-200 text-red-900 font-bold text-xs flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Login Tab */}
        {tab === 'login' && (
          <div>
            {/* Evaluator 1-Click Fast Login Deck */}
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-slate-50 to-emerald-50/90 border border-emerald-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                  </span>
                  <div>
                    <span className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      {t('বিচারক ও মূল্যায়নকারী কুইক লগইন ডেক (Evaluator 1-Click Fast Login)', 'Judge & Evaluator 1-Click Fast Login Deck')}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t(
                        'নিচের যেকোনো প্রাতিষ্ঠানিক ভূমিকায় ক্লিক করে অবিলম্বে ডেমো সেশনে প্রবেশ করুন (স্ক্রোল করার প্রয়োজন নেই):',
                        'Click any key institutional role below for instant demo sign-in (no scrolling required):'
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 self-start sm:self-center">
                  {t('লাইভ টেস্ট প্রস্তুত', 'Evaluation Ready')}
                </span>
              </div>

              {/* 6 Key Role Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {FAST_EVALUATOR_ROLES.map((role) => {
                  const cred = DEMO_CREDENTIALS.find((c) => c.username === role.username);
                  const isSelected = username === role.username;
                  return (
                    <div
                      key={role.roleKey}
                      className={`relative flex flex-col justify-between p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-[#006A4E] bg-white ring-2 ring-[#006A4E]/20 shadow-xs'
                          : 'border-slate-200 bg-white/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                          {lang === 'bn' ? role.nameBn : role.nameEn}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${role.dot}`} />
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate mb-1">
                        {lang === 'bn' ? cred?.nameBn || role.titleBn : cred?.nameEn || role.titleEn}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate mb-2">
                        user: {role.username}
                      </div>
                      <div className="flex gap-1 mt-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (cred) fillAndCopy(cred, false);
                          }}
                          title={t('ফর্মে ইউজারনেম ও পাসওয়ার্ড বসান', 'Fill credentials into form')}
                          className="flex-1 py-1 px-1.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer text-center"
                        >
                          {t('পূরণ', 'Fill')}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            if (cred) fillAndCopy(cred, true);
                          }}
                          title={t('সরাসরি এই ভূমিকায় লগইন করুন', 'Instant 1-click login as this role')}
                          className="flex-1 py-1 px-1.5 rounded text-[10px] font-bold bg-[#006A4E] hover:bg-[#00553e] text-white transition cursor-pointer flex items-center justify-center gap-0.5 shadow-2xs"
                        >
                          <LogIn className="w-2.5 h-2.5 shrink-0" />
                          <span>{t('লগইন', 'Login')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Official Login Form */}
            <form
              id="login-form-card"
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="md:col-span-7 space-y-4"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {t('আপনার অ্যাকাউন্টে প্রবেশ করুন', 'Sign In to Your Workspace')}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('নাগরিক বা অনুমোদিত কর্মকর্তা ক্রেডেনশিয়াল প্রদান করুন', 'Enter citizen or authorized officer credentials')}
                </p>
              </div>

              {credentialToast && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-2 shadow-xs animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900">{credentialToast.roleName}</span>
                      <span className="text-emerald-800">
                        {' '}— ইউজারনেম (<span className="font-mono font-bold text-slate-900">{credentialToast.username}</span>) ও পাসওয়ার্ড ফর্মে পূরণ ও কপি করা হয়েছে!
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-200/60 px-2 py-0.5 rounded shrink-0">
                    {t('পূরণ সম্পন্ন', 'Filled')}
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="auth-username" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('ইউজারনেম / ইমেইল / মোবাইল নম্বর (Username / Email / Mobile):', 'Username / Email / Mobile Phone:')}
                </label>
                <div className="relative">
                  <input
                    id="auth-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('ইউজারনেম, ইমেইল অথবা মোবাইল নম্বর দিন (যেমন: citizen)', 'Username, email or mobile (e.g. citizen)')}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-sm placeholder:text-slate-500 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/20 focus:outline-none"
                    required
                  />
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-bold text-slate-700 mb-1.5">
                  {t('গোপনীয় পাসওয়ার্ড (Password):', 'Password:')}
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 font-mono text-sm placeholder:text-slate-500 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/20 focus:outline-none"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t('পাসওয়ার্ড লুকান', 'Hide password') : t('পাসওয়ার্ড দেখুন', 'Show password')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-sm cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? t('যাচাই হচ্ছে...', 'Verifying credentials...') : t('পোর্টালে প্রবেশ করুন', 'Sign In to Workspace')}</span>
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">
                  {t('কোনো অ্যাকাউন্ট নেই? ', "Don't have an account? ")}
                </span>
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                >
                  {t('নাগরিক নিবন্ধন করুন', 'Register as Citizen')}
                </button>
              </div>
            </form>

            {/* Right: Security Standards & Institutional Notice */}
            <div className="md:col-span-5 bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-800 border-b border-slate-200 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{t('প্রাতিষ্ঠানিক নিরাপত্তা নির্দেশিকা ও প্রটোকল', 'Security Standards & Protocol')}</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">ডিজিটাল দলিলের অখণ্ডতা ও নিরাপত্তা</span>
                    <span>ভূমি দলিলের প্রতিটি স্বাক্ষরে প্রাতিষ্ঠানিক ডিজিটাল সুরক্ষা এবং সেশনে সুরক্ষিত টোকেন ব্যবহৃত হয়।</span>
                    <details className="mt-1 text-[11px] text-slate-500 cursor-pointer">
                      <summary className="hover:text-slate-700 font-medium">প্রযুক্তিগত বিস্তারিত (Ed25519 / Token)</summary>
                      <div className="mt-1 font-mono text-[10px] bg-slate-100 p-1.5 rounded">
                        Protocol: Ed25519 Asymmetric Digital Signature & Revocable Bearer Tokens.
                      </div>
                    </details>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">কঠোর রোল-ভিত্তিক প্রবেশাধিকার</span>
                    <span>সাব-রেজিস্ট্রার, এসি ল্যান্ড ও ব্যাংক অফিসার অ্যাকাউন্ট শুধুমাত্র সংশ্লিষ্ট প্রশাসনিক দপ্তর কর্তৃক ইস্যু করা হয়।</span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800 block">কেন্দ্রীয় অডিট ট্রেইল</span>
                    <span>সমর্থিত রেকর্ড পরিবর্তন ও দাপ্তরিক সিদ্ধান্ত অডিট ট্রেইলে নথিভুক্ত হয়।</span>
                  </div>
                </li>
              </ul>

              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{t('জরুরি সহায়তা: জাতীয় হেল্পলাইন ১৬১২২', 'Emergency Support: National Helpline 16122')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Evaluator Demo Credentials Directory (All 22+ Roles with Copy & 1-Click Login) */}
        {tab === 'login' && (() => {
          const filteredCredentials = DEMO_CREDENTIALS.filter((c) => {
            const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
            const query = credSearch.trim().toLowerCase();
            if (!query) return matchesCategory;
            return (
              matchesCategory &&
              (c.username.toLowerCase().includes(query) ||
                c.roleNameBn.toLowerCase().includes(query) ||
                c.roleNameEn.toLowerCase().includes(query) ||
                c.nameBn.toLowerCase().includes(query) ||
                c.nameEn.toLowerCase().includes(query) ||
                c.officeBn.toLowerCase().includes(query))
            );
          });

          return (
            <div className="mt-10 pt-8 border-t border-slate-200">
              {/* Directory Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-[#006A4E] flex items-center justify-center font-bold">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                      {t(
                        'সকল প্রাতিষ্ঠানিক ও নাগরিক ডেমো ভূমিকা (Demo Credentials Directory — ২২টি ভূমিকা)',
                        'All Institutional & Citizen Demo Roles (Directory — 22+ Roles)'
                      )}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {t(
                      'যেকোনো কার্ডের "কপি ও পূরণ" বাটনে ক্লিক করলে ইউজারনেম ও পাসওয়ার্ড সরাসরি উপরের লগইন ফর্মে চলে যাবে এবং ক্লিপবোর্ডে কপি হবে।',
                      'Click "Copy & Fill" on any card to automatically populate the username and password into the login form.'
                    )}
                  </p>
                </div>

                {/* Search box */}
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={credSearch}
                    onChange={(e) => setCredSearch(e.target.value)}
                    aria-label={t('পদবি, নাম বা ইউজারনেম খুঁজুন', 'Search role, name or username')}
                    placeholder={t('পদবি, নাম বা ইউজারনেম খুঁজুন...', 'Search role, name or username...')}
                    className="w-full pl-9 pr-7 py-2 rounded-lg border border-slate-300 text-xs font-medium placeholder:text-slate-500 focus:border-[#006A4E] focus:ring-2 focus:ring-[#006A4E]/20 focus:outline-none bg-white"
                  />
                  {credSearch && (
                    <button
                      type="button"
                      onClick={() => setCredSearch('')}
                      aria-label={t('অনুসন্ধান মুছুন', 'Clear search')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 mb-5 pb-1">
                {[
                  { id: 'all', labelBn: `সকল ভূমিকা (${DEMO_CREDENTIALS.length})`, labelEn: `All Roles (${DEMO_CREDENTIALS.length})` },
                  { id: 'citizen', labelBn: 'নাগরিক ও সেবা (৩)', labelEn: 'Citizen & Public (3)' },
                  { id: 'registry', labelBn: 'সাব-রেজিস্ট্রি (৩)', labelEn: 'Sub-Registry (3)' },
                  { id: 'acland', labelBn: 'এসি ল্যান্ড ও রাজস্ব (৫)', labelEn: 'AC Land & Revenue (5)' },
                  { id: 'survey', labelBn: 'জরিপ ও রেকর্ডস (২)', labelEn: 'Survey & Records (2)' },
                  { id: 'bank', labelBn: 'ব্যাংক ও বন্ধক (২)', labelEn: 'Bank & Mortgage (2)' },
                  { id: 'admin', labelBn: 'প্রশাসন ও অডিট (৬)', labelEn: 'Admin & Audit (6)' },
                  { id: 'specialist', labelBn: 'স্পেশালিস্ট ও আদালত (২)', labelEn: 'Specialist & Court (2)' },
                ].map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <span>{lang === 'bn' ? cat.labelBn : cat.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCredentials.map((c) => {
                  const isCopied = copiedUser === c.username;
                  const isCurrentFormUser = username === c.username;
                  return (
                    <div
                      key={c.username}
                      className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                        isCurrentFormUser
                          ? 'bg-emerald-50/60 border-[#006A4E] shadow-sm ring-2 ring-[#006A4E]/20'
                          : 'bg-slate-50/80 hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Top Badges & Quick Copy */}
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.color}`}>
                            {lang === 'bn' ? c.categoryBn : c.categoryEn}
                          </span>
                          <button
                            type="button"
                            onClick={() => fillAndCopy(c, false)}
                            title={t('লগইন ফর্মে পূরণ করুন ও ক্লিপবোর্ডে কপি করুন', 'Fill into form & copy to clipboard')}
                            className={`text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition cursor-pointer border ${
                              isCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span className="text-[11px]">{t('কপি সম্পন্ন!', 'Copied!')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span className="text-[11px]">{t('কপি ও পূরণ', 'Copy & Fill')}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Role & Officer Details */}
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-snug">
                            {lang === 'bn' ? c.roleNameBn : c.roleNameEn}
                          </h4>
                          <div className="text-xs text-slate-600 font-medium mt-0.5">
                            {lang === 'bn' ? c.nameBn : c.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={c.officeBn}>
                            {c.officeBn}
                          </div>
                        </div>

                        {/* Credentials Display Box */}
                        <div className="bg-white/90 rounded-lg p-2.5 border border-slate-200/80 font-mono text-xs flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-[10px] block uppercase">User</span>
                            <span className="font-bold text-slate-800">{c.username}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-[10px] block uppercase">Pass</span>
                            <span className="font-bold text-slate-600">{c.password}</span>
                          </div>
                        </div>

                        {/* Scope/Role summary */}
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {lang === 'bn' ? c.descBn : c.descEn}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 mt-3 border-t border-slate-200/70 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => fillAndCopy(c, false)}
                          className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            isCurrentFormUser
                              ? 'bg-[#006A4E] text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCurrentFormUser ? t('ফর্মে রয়েছে', 'In Form') : t('ফর্ম পূরণ', 'Fill Form')}</span>
                        </button>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => fillAndCopy(c, true)}
                          className="w-full py-2 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                        >
                          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t('১-ক্লিক লগইন', 'Instant Login')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCredentials.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">
                    {t('কোনো ভূমিকা বা ইউজারনেম মেলেনি।', 'No matching credentials found.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCredSearch('');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 text-xs font-bold text-[#006A4E] hover:underline cursor-pointer"
                  >
                    {t('সবগুলো দেখুন', 'Reset filters')}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* 2. Citizen Registration Tab (Supports Phone and Email Registration) */}
        {tab === 'register' && (
          <div>
            {regPendingNotice ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-6 rounded-2xl bg-amber-50/80 border-2 border-amber-300 text-amber-950 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-extrabold text-amber-900">
                          {t('নাগরিক নিবন্ধন সফল — সুপার অ্যাডমিন অনুমোদনের অপেক্ষায়', 'Registration Submitted — Pending Super Admin Approval')}
                        </h2>
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          PENDING_ADMIN_VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        {t(
                          'আপনার নাগরিক অ্যাকাউন্ট নিবন্ধন তথ্য সিস্টেমে সফলভাবে সংরক্ষিত হয়েছে। ভূমি রেকর্ডের সংবেদনশীলতা ও জাতীয় নিরাপত্তার স্বার্থে সুপার অ্যাডমিন কর্তৃক প্রোফাইল যাচাইকরণের পর অ্যাকাউন্টটি অনুমোদিত হবে।',
                          'Your registration details have been submitted. Under BhumiShield security policies, citizen profiles require Super Admin verification before full workspace access is unlocked.'
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Citizen Registration Summary Card */}
                  <div className="p-4 rounded-xl bg-white border border-amber-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">{t('পূর্ণ নাম', 'Full Name')}</span>
                      <span className="font-bold text-slate-800 text-sm">{regPendingNotice.full_name_bn}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">{t('ইউজারনেম', 'Username')}</span>
                      <span className="font-mono font-bold text-emerald-800 text-sm">@{regPendingNotice.username}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">{t('নিবন্ধন মাধ্যম', 'Channel')}</span>
                      <span className="font-bold text-slate-700 capitalize flex items-center gap-1.5 mt-0.5">
                        {regPendingNotice.registration_channel === 'email' ? <Mail className="w-3.5 h-3.5 text-blue-600" /> : <Phone className="w-3.5 h-3.5 text-emerald-600" />}
                        {regPendingNotice.registration_channel === 'email' ? t('ইমেইল', 'Email') : t('মোবাইল নম্বর', 'Phone')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px] font-bold">{t('যোগাযোগের তথ্য', 'Contact')}</span>
                      <span className="font-mono text-slate-700">
                        {regPendingNotice.registration_channel === 'email' ? regPendingNotice.email : regPendingNotice.phone_dummy}
                      </span>
                    </div>
                  </div>

                  {/* Flow guidance note */}
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span>
                      {t(
                        'পরবর্তী ধাপ: সুপার অ্যাডমিন অনুমোদনের পর আপনি লগইন করলে একটি সংক্ষিপ্ত পপ-আপ ফর্মে ছবি, অভিভাবকের নাম ও পূর্ণ ঠিকানা দিয়ে প্রোফাইল সম্পূর্ণ করতে পারবেন এবং তাৎক্ষণিকভাবে সকল নাগরিক সেবা ব্যবহার করতে পারবেন।',
                        'Next Step: Once the Super Admin verifies your account, log in to complete your profile via a quick modal to unlock all services.'
                      )}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setVerificationTargetNid(regPendingNotice.nid || '');
                        setIsVerificationModalOpen(true);
                      }}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-sm transition flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-200" />
                      <span>{t('এনআইডি ও বায়োমেট্রিক এখনই যাচাই করুন', 'Verify NID & Biometrics Now')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegPendingNotice(null);
                        setTab('login');
                      }}
                      className="px-5 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-sm transition flex items-center gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{t('লগইন স্ক্রিনে যান (Proceed to Sign In)', 'Go to Sign In')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPendingNotice(null)}
                      className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      {t('অন্য একটি অ্যাকাউন্ট নিবন্ধন করুন', 'Register Another Account')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {t('নাগরিক অ্যাকাউন্ট নিবন্ধন (মোবাইল বা ইমেইল)', 'Citizen Account Registration (Phone or Email)')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t('মোবাইল নম্বর অথবা ইমেইল ঠিকানা দিয়ে নতুন নাগরিক অ্যাকাউন্ট তৈরি করুন', 'Create a new citizen account using either mobile phone number or email address')}
                  </p>
                </div>

                {/* Registration Method Switcher */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRegMethod('phone')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      regMethod === 'phone'
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                    <span>{t('মোবাইল নম্বর দিয়ে নিবন্ধন (Register with Phone)', 'Register with Phone')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegMethod('email')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      regMethod === 'email'
                        ? 'bg-[#006A4E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>{t('ইমেইল ঠিকানা দিয়ে নিবন্ধন (Register with Email)', 'Register with Email')}</span>
                  </button>
                </div>

                {/* Account Type Badge */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>{t('অ্যাকাউন্টের ধরন: সাধারণ নাগরিক (Citizen Account)', 'Account Type: Verified Citizen Account')}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    Role: citizen
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Primary identifier based on method */}
                  {regMethod === 'phone' ? (
                    <div>
                      <label htmlFor="reg-primary-phone" className="block text-xs font-bold text-slate-700 mb-1">
                        {t('মোবাইল নম্বর (বাধ্যতামূলক):', 'Mobile Phone Number (Required):')} <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reg-primary-phone"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="01700-000999"
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs placeholder:text-slate-500 focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="reg-primary-email" className="block text-xs font-bold text-slate-700 mb-1">
                        {t('ইমেইল ঠিকানা (বাধ্যতামূলক):', 'Email Address (Required):')} <span className="text-red-600">*</span>
                      </label>
                      <input
                        id="reg-primary-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="citizen@domain.com"
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs placeholder:text-slate-500 focus:border-[#006A4E] focus:ring-1 focus:ring-[#006A4E]"
                        required
                      />
                    </div>
                  )}

                  {/* Secondary optional identifier */}
                  {regMethod === 'phone' ? (
                    <div>
                      <label htmlFor="reg-secondary-email" className="block text-xs font-bold text-slate-700 mb-1">
                        {t('ইমেইল ঠিকানা (ঐচ্ছিক):', 'Email Address (Optional):')}
                      </label>
                      <input
                        id="reg-secondary-email"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@domain.com"
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs placeholder:text-slate-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="reg-secondary-phone" className="block text-xs font-bold text-slate-700 mb-1">
                        {t('মোবাইল নম্বর (ঐচ্ছিক):', 'Phone Number (Optional):')}
                      </label>
                      <input
                        id="reg-secondary-phone"
                        type="tel"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="01700-000999"
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs placeholder:text-slate-500"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="reg-username" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('ইউজারনেম (Username):', 'Username:')}
                    </label>
                    <input
                      id="reg-username"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder={regMethod === 'email' ? 'e.g. saiful_islam (ঐচ্ছিক)' : 'e.g. saiful_islam'}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono placeholder:text-slate-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      {t('খালি রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে', 'Auto-generated if left empty')}
                    </span>
                  </div>

                  <div>
                    <label htmlFor="reg-password" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('গোপনীয় পাসওয়ার্ড (Password):', 'Password:')} <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="reg-password"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-name-bn" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('পূর্ণ নাম (বাংলায়):', 'Full Name (Bangla):')} <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="reg-name-bn"
                      type="text"
                      value={regNameBn}
                      onChange={(e) => setRegNameBn(e.target.value)}
                      placeholder="মোঃ সাইফুল ইসলাম"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs placeholder:text-slate-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-name-en" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('পূর্ণ নাম (ইংরেজিতে):', 'Full Name (English):')}
                    </label>
                    <input
                      id="reg-name-en"
                      type="text"
                      value={regNameEn}
                      onChange={(e) => setRegNameEn(e.target.value)}
                      placeholder="Md. Saiful Islam"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-nid" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('জাতীয় পরিচয়পত্র / এনআইডি নম্বর:', 'NID Number:')}
                    </label>
                    <input
                      id="reg-nid"
                      type="text"
                      value={regNid}
                      onChange={(e) => setRegNid(e.target.value)}
                      placeholder="9900001099"
                      className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs placeholder:text-slate-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      {t('১০ বা ১৭ ডিজিট (প্রোফাইল সম্পন্নকালেও দেওয়া যাবে)', 'Can also be updated during profile completion')}
                    </span>
                  </div>

                  <div>
                    <label htmlFor="reg-office" className="block text-xs font-bold text-slate-700 mb-1">
                      {t('ঠিকানা / অবস্থান:', 'Address / Location:')}
                    </label>
                    <input
                      id="reg-office"
                      type="text"
                      value={regOffice}
                      onChange={(e) => setRegOffice(e.target.value)}
                      placeholder="ঢাকা, বাংলাদেশ"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-xs placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    {t(
                      'নিরাপত্তা নির্দেশিকা: সাধারণ নাগরিক নিবন্ধন ব্যতীত অন্যান্য কর্মকর্তা ও ব্যাংক প্যানেলের আইডি প্রশাসনিকভাবে সুপার অ্যাডমিন কর্তৃক নিয়ন্ত্রিত ও অনুমোদিত হয়।',
                      'Security Notice: Official and bank panel institutional IDs are provisioned exclusively under Super Admin governance.'
                    )}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="py-3 px-6 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-sm transition flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{loading ? t('নিবন্ধন প্রক্রিয়াধীন...', 'Registering...') : t('নাগরিক অ্যাকাউন্ট নিবন্ধন করুন', 'Complete Citizen Registration')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 3. Profile Tab */}
        {tab === 'profile' && user && (
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('প্রোফাইল ও নিরাপত্তা সেটিংস', 'Profile & Security Settings')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('আপনার ব্যক্তিগত বিবরণ ও পাসওয়ার্ড পরিবর্তন করুন', 'Update personal details and change password')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (বাংলা):', 'Full Name (Bangla):')}
                </label>
                <input
                  type="text"
                  value={profNameBn}
                  onChange={(e) => setProfNameBn(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('পূর্ণ নাম (ইংরেজি):', 'Full Name (English):')}
                </label>
                <input
                  type="text"
                  value={profNameEn}
                  onChange={(e) => setProfNameEn(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('মোবাইল নম্বর:', 'Phone:')}
                </label>
                <input
                  type="text"
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    {t('জাতীয় পরিচয়পত্র (NID):', 'National ID (NID):')}
                  </label>
                  {Number(user?.is_identity_verified) === 1 ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ {t('যাচাইকৃত', 'Verified')}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⏳ {t('যাচাই অপেক্ষমাণ', 'Pending Verification')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationTargetNid(profNid || user?.nid || '');
                          setIsVerificationModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-white bg-[#006A4E] hover:bg-emerald-800 px-2 py-0.5 rounded shadow-2xs transition cursor-pointer"
                      >
                        {t('এখনই যাচাই করুন', 'Verify Now')}
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={profNid}
                  readOnly={Number(user?.is_identity_verified) === 1}
                  onChange={(e) => setProfNid(e.target.value)}
                  placeholder="e.g. 19901234567890123"
                  className={`w-full p-2.5 rounded-lg border text-xs font-mono ${
                    Number(user?.is_identity_verified) === 1
                      ? 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-[#006A4E]'
                  }`}
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {Number(user?.is_identity_verified) === 1
                    ? t('যাচাইকৃত পরিচয়পত্র পরিবর্তনের জন্য হেল্পলাইনে যোগাযোগ করুন।', 'Contact helpline to correct verified identity.')
                    : t('১০ বা ১৭ ডিজিটের এনআইডি দিন (অ্যাডমিন অনুমোদনের পর ভেরিফাইড হবে)।', 'Enter 10 or 17-digit NID (will be verified by admin).')}
                </span>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('অফিস / ঠিকানা:', 'Office / Location:')}
                </label>
                <input
                  type="text"
                  value={profOffice}
                  readOnly={user?.role !== 'admin'}
                  onChange={(e) => setProfOffice(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold" htmlFor="profile-current-password">{t('বর্তমান পাসওয়ার্ড (পরিবর্তনের জন্য)', 'Current Password (to change password)')}</label>
                <input id="profile-current-password" type="password" autoComplete="current-password" className="field" value={profCurrentPass} onChange={(e) => setProfCurrentPass(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('নতুন পাসওয়ার্ড (ঐচ্ছিক):', 'New Password (Optional):')}
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={profNewPass}
                  onChange={(e) => setProfNewPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs cursor-pointer shadow-xs transition"
              >
                {t('প্রোফাইল সংরক্ষণ করুন', 'Save Profile')}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* NID Porichoy Verification Modal */}
      <CitizenVerificationModal
        isOpen={isVerificationModalOpen}
        initialNid={verificationTargetNid || profNid || user?.nid || ''}
        onClose={() => setIsVerificationModalOpen(false)}
        onSuccess={() => {
          if (user) {
            setUser({
              ...user,
              is_identity_verified: 1,
              nid: verificationTargetNid || profNid || user.nid,
            });
            setProfNid(verificationTargetNid || profNid || user.nid || '');
          }
          setSuccessMsg(t('এনআইডি ও বায়োমেট্রিক পরিচয় সফলভাবে নিশ্চিত করা হয়েছে!', 'NID & Biometrics verified successfully!'));
        }}
      />
    </div>
  );
};
