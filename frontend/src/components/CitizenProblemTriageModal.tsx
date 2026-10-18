import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  X,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  PlusCircle,
  UserCheck,
  Send,
  Scale
} from 'lucide-react';
import { useAppUI } from '../i18n';
import { toBanglaDigits } from '../theme/tokens';
import { BhumiApi } from '../api/client';

export interface CitizenProblemTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

interface ProblemItem {
  id: string;
  icon: string;
  titleBn: string;
  titleEn: string;
  category: string;
  serviceType: 'INTERNAL' | 'EXTERNAL_OFFICIAL' | 'ASSISTED';
  competentRoleBn: string;
  competentRoleEn: string;
  attendanceStatus: 'NOT_NEEDED' | 'NOTICE_DEPENDENT' | 'MANDATORY_PHYSICAL';
  attendanceReasonBn: string;
  attendanceReasonEn: string;
  documentsBn: string[];
  documentsEn: string[];
  feeScheduleBn: string;
  feeScheduleEn: string;
  feeCircularBn: string;
  officialRoute: string;
}

const PROBLEMS: ProblemItem[] = [
  {
    id: 'LINK_PROPERTY',
    icon: '🔍',
    titleBn: 'আমার জমি প্রোফাইলে দেখতে পাচ্ছি না / রেকর্ড লিঙ্ক বা দাবি করতে চাই',
    titleEn: 'My land is not visible / I want to link or claim my property',
    category: 'LAND_CLAIM',
    serviceType: 'INTERNAL',
    competentRoleBn: 'সহকারী কমিশনার (ভূমি) ও ভূমি সহকারী কর্মকর্তা',
    competentRoleEn: 'Assistant Commissioner (Land) & Union Land Officer',
    attendanceStatus: 'NOT_NEEDED',
    attendanceReasonBn: 'অনলাইন ভল্ট লিঙ্কিং সম্পূর্ণ ডিজিটাল ও দলিলাদি ভিত্তিক। প্রাথমিক দাবির জন্য সশরীরে উপস্থিতির প্রয়োজন নেই।',
    attendanceReasonEn: 'Online record claim is evidence-based and digital. In-person attendance is not required for claim filing.',
    documentsBn: [
      'মালিকানার মূল বা সার্টিফাইড রেজিস্ট্রি দলিল',
      'সর্বশেষ আরএস/বিএস খতিয়ান কপি',
      'হালনাগাদ ভূমি উন্নয়ন কর (দাখিলা) রসিদ',
      'জাতীয় পরিচয়পত্র (এনআইডি) নম্বর'
    ],
    documentsEn: [
      'Original or certified sale deed',
      'Latest RS/BS khatian copy',
      'Updated Land Development Tax receipt',
      'National ID (NID) card'
    ],
    feeScheduleBn: 'সম্পূর্ণ বিনামূল্যে (সরকারি রেকর্ড রুম অনুসন্ধান প্রযোজ্য হলে নিয়মানুযায়ী ফি)',
    feeScheduleEn: 'Free of charge (Nominal search fees apply if archive retrieval requested)',
    feeCircularBn: 'ভূমি মন্ত্রণালয় সিটিজেন চার্টার ২০২৬',
    officialRoute: 'tickets?category=LAND_CLAIM'
  },
  {
    id: 'MUTATION_PURCHASE',
    icon: '📜',
    titleBn: 'জমি ক্রয় করেছি, নামজারি (ই-নামজারি) করতে হবে',
    titleEn: 'I bought land and need mutation (e-Mutation)',
    category: 'MUTATION',
    serviceType: 'EXTERNAL_OFFICIAL',
    competentRoleBn: 'সহকারী কমিশনার (ভূমি), সংশ্লিষ্ট উপজেলা',
    competentRoleEn: 'Assistant Commissioner (Land) of property upazila',
    attendanceStatus: 'NOT_NEEDED',
    attendanceReasonBn: 'ভূমি মন্ত্রণালয়ের ২০২২ পরিপত্র অনুসারে সকল কাগজপত্র সঠিক ও বায়া চেইন অটুট থাকলে সশরীরে শুনানি বা ইউনিয়ন অফিসে যাওয়া বাধ্যতামূলক নয়।',
    attendanceReasonEn: 'Under Ministry of Land Circular 2022, in-person hearing is not mandatory if deed and title lineage are valid.',
    documentsBn: [
      'সাব-রেজিস্ট্রি অফিস হতে প্রাপ্ত মূল দলিল বা দলিলের অবিকল নকল',
      'বায়া দলিলের ধারাবাহিক কপি (প্রযোজ্য ক্ষেত্রে)',
      'খারিজ খতিয়ান / সিএস, এসএ, আরএস ও বিএস খতিয়ান',
      'ভূমি উন্নয়ন কর পরিশোধের দাখিলা'
    ],
    documentsEn: [
      'Registered sale deed or certified copy',
      'Chain / provenance deeds (if applicable)',
      'Previous khatian (CS/SA/RS/BS)',
      'Up-to-date land tax receipt'
    ],
    feeScheduleBn: 'মোট ১,১৭০/- টাকা (কোর্ট ফি ২০/- + নোটিশ জারি ৫০/- + রেকর্ড সংশোধন বা ডিসিআর ১,০০০/- + খতিয়ান ফি ১০০/-)',
    feeScheduleEn: 'Total BDT 1,170 (Court Fee 20 + Notice 50 + DCR 1,000 + Porcha 100)',
    feeCircularBn: 'ভূমি মন্ত্রণালয় পরিপত্র নং ১৪-২৬/২০২২ (কার্যকর: জুলাই ২০২২ হতে চলমান)',
    officialRoute: 'https://mutation.land.gov.bd'
  },
  {
    id: 'DISCREPANCY_RECORD',
    icon: '⚖️',
    titleBn: 'নাম, এনআইডি, দাগ নম্বর বা ক্ষেত্রফলে অমিল / ভুল রয়েছে',
    titleEn: 'Discrepancy in name, NID, plot number or area',
    category: 'RECORD_CORRECTION',
    serviceType: 'ASSISTED',
    competentRoleBn: 'সহকারী কমিশনার (ভূমি) / মিস-কেস আদালত',
    competentRoleEn: 'AC Land / Revenue Court Review',
    attendanceStatus: 'NOTICE_DEPENDENT',
    attendanceReasonBn: 'প্রাথমিক সংশোধন আবেদন অনলাইনে দাখিল করা যায়। তবে ক্ষেত্রফল বা স্বত্ব বিষয়ে নোটিশ জারি হলে শুনানিতে উপস্থিত থাকতে হবে।',
    attendanceReasonEn: 'Initial review is submitted online. Attendance is only required if a formal discrepancy hearing notice is issued.',
    documentsBn: [
      'সংশোধনের সপক্ষে প্রামাণ্য দলিল ও খতিয়ান',
      'জাতীয় পরিচয়পত্র সংশোধনের প্রমাণপত্র (নামের ভুলের ক্ষেত্রে)',
      'মাঠ জরিপ বা আমিন পরিমাপ প্রতিবেদন'
    ],
    documentsEn: [
      'Supporting title deeds and khatian',
      'NID correction certificate (if name error)',
      'Field survey or surveyor report'
    ],
    feeScheduleBn: 'কোর্ট ফি ২০/- টাকা (মিস-কেস আবেদন ফি)',
    feeScheduleEn: 'Court fee BDT 20 for revenue review application',
    feeCircularBn: 'স্টেট একুইজিশন অ্যান্ড টেন্যান্সি অ্যাক্ট ১৯৫০ (ধারা ১৪৩/১৫০)',
    officialRoute: 'tickets?category=RECORD_CORRECTION'
  },
  {
    id: 'INHERITANCE_FARAIZ',
    icon: '👥',
    titleBn: 'পৈত্রিক / ওয়ারিশান সূত্রে প্রাপ্ত জমি বণ্টন ও নামজারি',
    titleEn: 'Inherited property / joint-share succession mutation',
    category: 'INHERITANCE',
    serviceType: 'ASSISTED',
    competentRoleBn: 'সহকারী কমিশনার (ভূমি) ও ইউনিয়ন ভূমি কর্মকর্তা',
    competentRoleEn: 'AC Land & Union Land Officer',
    attendanceStatus: 'NOTICE_DEPENDENT',
    attendanceReasonBn: 'সকল ওয়ারিশের সম্মতি থাকলে অনলাইন আবেদন যথেষ্ট। কোনো ওয়ারিশের আপত্তি বা অপ্রাপ্তবয়স্ক থাকলে শুনানিতে উপস্থিত হতে হবে।',
    attendanceReasonEn: 'Online filing is sufficient if all heirs agree. Attendance required only if objection raised by co-heirs.',
    documentsBn: [
      'স্থানীয় সরকার প্রতিষ্ঠান (পৌরসভা/ইউপি) প্রদত্ত ওয়ারিশান সনদ',
      'ইসলামিক ফারায়েজ সনদ বা উত্তরাধিকার বণ্টন হিসাব',
      'মৃত রেকর্ডীয় ব্যক্তির মৃত্যু সনদ ও খতিয়ান',
      'অন্যান্য ওয়ারিশদের অনাপত্তিপত্র বা বণ্টননামা'
    ],
    documentsEn: [
      'Heirship certificate from Local Council (UP/Municipality)',
      'Faraiz certificate / succession calculation',
      'Death certificate and recorded khatian of deceased',
      'No-objection consent or partition deed of co-heirs'
    ],
    feeScheduleBn: 'নামজারি ফি ১,১৭০/- টাকা',
    feeScheduleEn: 'Statutory mutation fee BDT 1,170',
    feeCircularBn: 'ভূমি মন্ত্রণালয় উত্তরাধিকার নামজারি নির্দেশিকা',
    officialRoute: 'tickets?category=INHERITANCE'
  },
  {
    id: 'TAX_HOLDING',
    icon: '💳',
    titleBn: 'ভূমি উন্নয়ন কর (খাজনা) বা হোল্ডিং নম্বর পাওয়া যাচ্ছে না / ভুল',
    titleEn: 'Land development tax holding missing or incorrect',
    category: 'TAX_HOLDING',
    serviceType: 'EXTERNAL_OFFICIAL',
    competentRoleBn: 'ইউনিয়ন ভূমি সহকারী কর্মকর্তা (তহশিলদার)',
    competentRoleEn: 'Union Land Assistant Officer (Tehsildar)',
    attendanceStatus: 'NOT_NEEDED',
    attendanceReasonBn: 'অনলাইন ভূমি উন্নয়ন কর পোর্টাল (ldtax.gov.bd)-এ হোল্ডিং এন্ট্রি ও যাচাই সম্পন্ন করা যায়। ইউনিয়ন অফিসে যাওয়ার প্রয়োজন নেই।',
    attendanceReasonEn: 'Online tax portal enables holding entry and verification without visiting union land office.',
    documentsBn: [
      'সর্বশেষ পরিশোধিত খাজনার দাখিলা রসিদ',
      'বিএস বা আরএস খতিয়ান কপি',
      'জাতীয় পরিচয়পত্র ও মোবাইল নম্বর'
    ],
    documentsEn: [
      'Last paid tax receipt (Dakhila)',
      'BS or RS khatian copy',
      'NID and mobile number'
    ],
    feeScheduleBn: 'হোল্ডিং এন্ট্রি সম্পূর্ণ বিনামূল্যে; করের পরিমাণ জমি ব্যবহারের ধরন ও এলাকা অনুসারে নির্ধারিত হয়',
    feeScheduleEn: 'Holding registration is free; tax amount depends on land classification and zoning rate',
    feeCircularBn: 'ভূমি উন্নয়ন কর আইন ২০২৩',
    officialRoute: 'https://ldtax.gov.bd'
  },
  {
    id: 'CERTIFIED_COPY',
    icon: '🗂️',
    titleBn: 'খতিয়ানের সহি মোহর (পর্চা), মৌজা নকশা বা দলিলের নকল প্রয়োজন',
    titleEn: 'Need certified khatian copy (Porcha), mouza map or deed copy',
    category: 'CERTIFIED_COPY',
    serviceType: 'EXTERNAL_OFFICIAL',
    competentRoleBn: 'জেলা রেকর্ড রুম / সাব-রেজিস্ট্রার কার্যালয়',
    competentRoleEn: 'District Record Room / Sub-Registry Office',
    attendanceStatus: 'NOT_NEEDED',
    attendanceReasonBn: 'ই-পর্চা বা ই-নকশার আবেদন সম্পূর্ণ অনলাইন। ডাকযোগে সরাসরি বাড়িতে ডেলিভারি নেওয়া যায়।',
    attendanceReasonEn: 'e-Porcha and e-Map applications are online with optional postal home delivery.',
    documentsBn: [
      'খতিয়ান নম্বর বা দাগ নম্বর',
      'মৌজা ও জে.এল. নম্বর',
      'ডেলিভারি ঠিকানা ও মোবাইল নম্বর'
    ],
    documentsEn: [
      'Khatian number or plot dag number',
      'Mouza and JL number',
      'Postal delivery address and phone'
    ],
    feeScheduleBn: 'পর্চা কোর্ট ফি ১০০/- টাকা (ডাকযোগে নিলে অতিরিক্ত ডেলিভারি চার্জ ৪০/- টাকা)',
    feeScheduleEn: 'Certified copy fee BDT 100 (+ BDT 40 for postal delivery)',
    feeCircularBn: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর সার্কুলার ২০২৪',
    officialRoute: 'https://eporcha.gov.bd'
  },
  {
    id: 'HEARING_NOTICE',
    icon: '📢',
    titleBn: 'শুনানি, জরিপ আপত্তি বা খতিয়ান সংশোধন নোটিশ পেয়েছি',
    titleEn: 'Received hearing notice, survey objection or correction notice',
    category: 'HEARING_NOTICE',
    serviceType: 'ASSISTED',
    competentRoleBn: 'বিজ্ঞ রাজস্ব আদালত (এসি ল্যান্ড) / সেটেলমেন্ট অফিসার',
    competentRoleEn: 'Revenue Court (AC Land) / Settlement Officer',
    attendanceStatus: 'NOTICE_DEPENDENT',
    attendanceReasonBn: 'নোটিশে নির্দিষ্ট তারিখ ও সময় উল্লেখ থাকলে সশরীরে বা নিযুক্ত আইনজীবীর মাধ্যমে মূল দলিলাদিসহ হাজির হতে হবে।',
    attendanceReasonEn: 'Must attend in person or through an authorized representative with original documents on the notified date.',
    documentsBn: [
      'প্রদত্ত সরকারি নোটিশের কপি',
      'মালিকানার মূল দলিল ও বায়া দলিলসমূহ',
      'দখল প্রমাণের সপক্ষে দাখিলা রসিদ ও সরেজমিন ছবি'
    ],
    documentsEn: [
      'Official notice copy received',
      'Original title deeds and chain documents',
      'Tax receipts and evidence of peaceful possession'
    ],
    feeScheduleBn: 'নোটিশের জবাব দাখিলে কোনো সরকারি ফি নেই',
    feeScheduleEn: 'No official fee for filing a hearing reply',
    feeCircularBn: 'রেভিনিউ কোর্ট রুলস অ্যান্ড প্রসিডিউর',
    officialRoute: 'tickets?category=HEARING_NOTICE'
  },
  {
    id: 'APPEAL_DELAY',
    icon: '⏳',
    titleBn: 'নামজারি বা সেবা আবেদনে অযৌক্তিক বিলম্ব, খারিজ বা বাতিল হয়েছে',
    titleEn: 'Application unduly delayed, rejected or dismissed',
    category: 'APPEAL',
    serviceType: 'ASSISTED',
    competentRoleBn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব) / ইউএনও সুপারভাইজার',
    competentRoleEn: 'Additional Deputy Commissioner (Revenue) / UNO',
    attendanceStatus: 'NOTICE_DEPENDENT',
    attendanceReasonBn: 'আপিল আবেদন অনলাইনে দাখিল করা যায়। আপিল কর্তৃপক্ষ শুনানির তারিখ নির্ধারণ করলে উভয় পক্ষকে উপস্থিত হতে হয়।',
    attendanceReasonEn: 'Appeals are filed online. Both parties appear only when the appellate court sets a hearing date.',
    documentsBn: [
      'এসি ল্যান্ড কর্তৃক খারিজকৃত আদেশের কপি',
      'মূল আবেদনের কেস নম্বর ও তারিখ',
      'আইনগত যুক্তি ও প্রামাণ্য নথিপত্র'
    ],
    documentsEn: [
      'Certified copy of rejection order by AC Land',
      'Original application case reference and date',
      'Grounds of appeal and supporting legal documents'
    ],
    feeScheduleBn: 'আপিল কোর্ট ফি ২০/- টাকা',
    feeScheduleEn: 'Appeal court fee BDT 20',
    feeCircularBn: 'স্টেট একুইজিশন অ্যাক্ট ১৯৫০ (ধারা ১৪৭ - আপিল ও রিভিউ)',
    officialRoute: 'tickets?category=APPEAL'
  },
  {
    id: 'ACQUISITION_NOTICE',
    icon: '🏗️',
    titleBn: 'ভূমি অধিগ্রহণ (ধারা ৪/৭/৮) নোটিশ বা ক্ষতিপূরণ সংক্রান্ত তথ্য',
    titleEn: 'Land acquisition notice (Section 4/7/8) or compensation enquiry',
    category: 'ACQUISITION',
    serviceType: 'ASSISTED',
    competentRoleBn: 'জেলা প্রশাসন (এল.এ শাখা / ভূমি অধিগ্রহণ কর্মকর্তা)',
    competentRoleEn: 'District Administration (Land Acquisition Branch)',
    attendanceStatus: 'NOTICE_DEPENDENT',
    attendanceReasonBn: 'ধারা ৪ নোটিশের পর আপত্তি দাখিল ডাকযোগে বা অনলাইনে সম্ভব। ধারা ৭/৮ শুনানিতে ক্ষতিপূরণ দাবির জন্য মূল দলিল সহ উপস্থিতি আবশ্যক।',
    attendanceReasonEn: 'Section 4 objections can be submitted remotely. Section 7/8 compensation verification requires physical presence with original title.',
    documentsBn: [
      'ধারা ৪ বা ধারা ৭ গেজেট নোটিশের কপি',
      'মালিকানার মূল খতিয়ান ও রেজিস্ট্রি দলিল',
      'জমির সীমানা ও দখল প্রমাণের সরেজমিন ভিডিও/ছবি',
      'ব্যাংক অ্যাকাউন্ট তথ্য (ক্ষতিপূরণ রোয়েদাদ প্রাপ্তির জন্য)'
    ],
    documentsEn: [
      'Section 4/7 gazette notice copy',
      'Original khatian and title deeds',
      'Possession evidence and field pictures',
      'Bank account information for compensation disbursement'
    ],
    feeScheduleBn: 'সরকারি অধিগ্রহণ আপত্তি বা ক্ষতিপূরণ দাবিতে কোনো ফি নেই',
    feeScheduleEn: 'No official fees for filing objection or compensation claim',
    feeCircularBn: 'স্থাবর সম্পত্তি অধিগ্রহণ ও হুকুমদখল আইন ২০১৭',
    officialRoute: 'tickets?category=ACQUISITION'
  },
  {
    id: 'COURT_DISPUTE',
    icon: '🛡️',
    titleBn: 'আদালতের নিষেধাজ্ঞা, জালিয়াতি বা অন্য কারো অবৈধ দখলের ঝুঁকি',
    titleEn: 'Court injunction, fraud risk or unauthorized dispute',
    category: 'DISPUTE_INJUNCTION',
    serviceType: 'ASSISTED',
    competentRoleBn: 'সহকারী কমিশনার (ভূমি) / সাব-রেজিস্ট্রার / দেওয়ানি আদালত',
    competentRoleEn: 'AC Land / Sub-Registrar / Civil Court',
    attendanceStatus: 'MANDATORY_PHYSICAL',
    attendanceReasonBn: 'আদালতের মামলার আদেশ বা স্থিতি সংক্রান্ত বিষয়ে সংশ্লিষ্ট আদালতে আইনগত প্রতিনিধির উপস্থিতি আবশ্যক।',
    attendanceReasonEn: 'Formal court injunction enforcement requires appearance before the competent civil court.',
    documentsBn: [
      'বিজ্ঞ দেওয়ানি আদালতের অন্তর্বর্তীকালীন স্থগিতাদেশ বা রায়',
      'মামলার আরজি বা জবাব কপি',
      'সাব-রেজিস্ট্রি অফিসে জমি লক/ফ্রিজ করার আবেদন'
    ],
    documentsEn: [
      'Certified injunction decree from Civil Court',
      'Plaint / Written statement copy',
      'Plot sale lock application for registry gatekeeper'
    ],
    feeScheduleBn: 'প্লট লক ও সিকিউরিটি ফ্রিজ আবেদন সম্পূর্ণ বিনামূল্যে',
    feeScheduleEn: 'Emergency plot security lock is free of charge',
    feeCircularBn: 'রেজিস্ট্রেশন বিধিমালা ও দেওয়ানি কার্যবিধি ১৯০৮',
    officialRoute: 'check'
  }
];

export const CitizenProblemTriageModal: React.FC<CitizenProblemTriageModalProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const { lang, t, user } = useAppUI();

  // Wizard Steps: 1 = Problem, 2 = Location (Residence vs Property), 3 = Guidance & Action
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedProblem, setSelectedProblem] = useState<ProblemItem>(PROBLEMS[0]);

  // Citizen Residence (Where I Live) vs Property Location (Where Land Is)
  const [residenceDistrict, setResidenceDistrict] = useState('ঢাকা');
  const [propertyDistrict, setPropertyDistrict] = useState('কুমিল্লা');
  const [propertyUpazila, setPropertyUpazila] = useState('দাউদকান্দি');
  const [propertyMouza, setPropertyMouza] = useState('সুন্দরপুর');
  const [propertyDagNo, setPropertyDagNo] = useState('');
  const [dontKnowLocation, setDontKnowLocation] = useState(false);

  // Land Claim Quick Form
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<{ ticketCode: string; message: string } | null>(null);

  if (!isOpen) return null;

  // Resolve Competent Office from Property Jurisdiction
  const resolvedOffice = useMemo(() => {
    if (dontKnowLocation) {
      return {
        nameBn: 'কেন্দ্রীয় ভার্চুয়াল রাজস্ব সেল (অজানা অধিক্ষেত্র সহায়তা)',
        nameEn: 'Central Revenue Support Cell',
        addressBn: 'ভূমি ভবন, তেজগাঁও, ঢাকা-১২০৮',
        phone: '16122',
        isDefault: true,
      };
    }

    if (propertyDistrict === 'কুমিল্লা' && propertyUpazila === 'দাউদকান্দি') {
      if (selectedProblem.id === 'MUTATION_PURCHASE' || selectedProblem.id === 'LINK_PROPERTY' || selectedProblem.id === 'DISCREPANCY_RECORD' || selectedProblem.id === 'INHERITANCE_FARAIZ') {
        return {
          id: 9,
          code: 'OFF-ACL-DAUDKANDI',
          nameBn: 'উপজেলা ভূমি অফিস (এসি ল্যান্ড), দাউদকান্দি, কুমিল্লা',
          nameEn: 'Upazila Land Office (AC Land), Daudkandi, Cumilla',
          addressBn: 'দাউদকান্দি উপজেলা পরিষদ রোড, দাউদকান্দি, কুমিল্লা',
          phone: '01711-334455',
          officerBn: 'সহকারী কমিশনার (ভূমি), দাউদকান্দি',
        };
      }
      if (selectedProblem.id === 'CERTIFIED_COPY' || selectedProblem.id === 'COURT_DISPUTE') {
        return {
          id: 8,
          code: 'OFF-REG-DAUDKANDI',
          nameBn: 'সাব-রেজিস্ট্রি অফিস, দাউদকান্দি, কুমিল্লা',
          nameEn: 'Sub-Registry Office, Daudkandi, Cumilla',
          addressBn: 'উপজেলা পরিষদ চত্বর, দাউদকান্দি, কুমিল্লা',
          phone: '01711-223344',
          officerBn: 'সাব-রেজিস্ট্রার, দাউদকান্দি',
        };
      }
      if (selectedProblem.id === 'ACQUISITION_NOTICE') {
        return {
          id: 12,
          code: 'OFF-DC-CUMILLA',
          nameBn: 'জেলা প্রশাসকের কার্যালয় (এল.এ শাখা), কুমিল্লা',
          nameEn: 'DC Office (LA Branch), Cumilla',
          addressBn: 'কালেক্টরেট ভবন, কুমিল্লা',
          phone: '081-68901',
          officerBn: 'অতিরিক্ত জেলা প্রশাসক (রাজস্ব) ও ভূমি অধিগ্রহণ কর্মকর্তা, কুমিল্লা',
        };
      }
      return {
        id: 10,
        code: 'OFF-SET-CUMILLA',
        nameBn: 'জোনাল সেটেলমেন্ট অফিস, কুমিল্লা',
        nameEn: 'Zonal Settlement Office, Cumilla',
        addressBn: 'ফৌজদারি মোড়, সেটেলমেন্ট ভবন, কুমিল্লা',
        phone: '081-65432',
        officerBn: 'জোনাল সেটেলমেন্ট অফিসার, কুমিল্লা',
      };
    }

    if (propertyDistrict === 'ঢাকা' && propertyUpazila === 'সাভার') {
      if (selectedProblem.id === 'MUTATION_PURCHASE' || selectedProblem.id === 'LINK_PROPERTY' || selectedProblem.id === 'DISCREPANCY_RECORD') {
        return {
          id: 3,
          code: 'OFF-ACL-SAVAR',
          nameBn: 'উপজেলা ভূমি অফিস, সাভার, ঢাকা',
          nameEn: 'Upazila Land Office, Savar, Dhaka',
          addressBn: 'উপজেলা চত্বর, সাভার, ঢাকা',
          phone: '01711-123456',
          officerBn: 'সহকারী কমিশনার (ভূমি), সাভার',
        };
      }
      return {
        id: 1,
        code: 'OFF-REG-SAVAR',
        nameBn: 'সাব-রেজিস্ট্রি অফিস, সাভার, ঢাকা',
        nameEn: 'Sub-Registry Office, Savar, Dhaka',
        addressBn: 'থানা রোড, সাভার, ঢাকা',
        phone: '01711-654321',
        officerBn: 'সাব-রেজিস্ট্রার, সাভার',
      };
    }

    if (propertyDistrict === 'গাজীপুর') {
      return {
        id: 2,
        code: 'OFF-REG-GAZIPUR',
        nameBn: 'সাব-রেজিস্ট্রি অফিস, গাজীপুর সদর',
        nameEn: 'Sub-Registry Office, Gazipur Sadar',
        addressBn: 'রাজবাড়ী রোড, গাজীপুর',
        phone: '01711-778899',
        officerBn: 'সাব-রেজিস্ট্রার, গাজীপুর সদর',
      };
    }

    return {
      nameBn: `উপজেলা ভূমি অফিস, ${propertyUpazila}, ${propertyDistrict}`,
      nameEn: `Upazila Land Office, ${propertyUpazila}, ${propertyDistrict}`,
      addressBn: `${propertyUpazila} উপজেলা পরিষদ প্রাঙ্গণ, ${propertyDistrict}`,
      phone: '16122',
      isDefault: true,
    };
  }, [propertyDistrict, propertyUpazila, dontKnowLocation, selectedProblem]);

  // Handle Land Claim Submission
  const handleSubmitLandClaim = async () => {
    setSubmittingClaim(true);
    try {
      const payload = {
        title: `আমার জমি প্রোফাইলে লিঙ্ক ও দাবির আবেদন (দাগ নং ${propertyDagNo || 'অজানা'})`,
        message: `নাগরিকের বর্তমান বাসস্থান: ${residenceDistrict}। জমির অবস্থান: ${propertyDistrict} জেলা, ${propertyUpazila} উপজেলা, ${propertyMouza} মৌজা। দাগ নম্বর: ${propertyDagNo || 'অজানা'}। বিবরণ: ${claimNotes || 'উক্ত জমি আমার খরিদকৃত/পৈত্রিক সূত্রে প্রাপ্ত। প্রোফাইলে ভল্ট সংযুক্ত করার অনুরোধ জানাচ্ছি।'}`,
        category: 'LAND_CLAIM',
      };
      const res = await BhumiApi.createTicket(payload);
      setClaimSuccess({
        ticketCode: res?.ticket?.ticket_code || 'CLM-2026-0812',
        message: lang === 'bn'
          ? `আপনার জমি লিঙ্কিং আবেদন সফলভাবে গ্রহণ করা হয়েছে! রেফারেন্স কোড: ${res?.ticket?.ticket_code || 'CLM-2026-0812'}। দায়িত্বপ্রাপ্ত এসি ল্যান্ড দপ্তর (${resolvedOffice.nameBn}) কর্তৃক রেকর্ড পর্যালোচনা করা হবে।`
          : `Claim submitted successfully! Reference: ${res?.ticket?.ticket_code || 'CLM-2026-0812'}.`,
      });
    } catch (err: any) {
      alert(err?.response?.data?.message_bn || err?.message || 'আবেদন দাখিলে ত্রুটি হয়েছে।');
    } finally {
      setSubmittingClaim(false);
    }
  };

  const getAttendanceBadge = (status: ProblemItem['attendanceStatus']) => {
    switch (status) {
      case 'NOT_NEEDED':
        return {
          labelBn: 'অনলাইন সেবা (সশরীরে উপস্থিতি অপ্রয়োজনীয়)',
          labelEn: 'Online Service (No Physical Attendance Needed)',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'NOTICE_DEPENDENT':
        return {
          labelBn: 'নোটিশ সাপেক্ষ (শুনানি বা আপত্তি থাকলে উপস্থিতি)',
          labelEn: 'Notice Dependent (Attendance only if notified)',
          color: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'MANDATORY_PHYSICAL':
        return {
          labelBn: 'সশরীরে উপস্থিতি আইনত আবশ্যক (রেজিস্ট্রেশন আইন)',
          labelEn: 'Physical Attendance Required (Registration Law)',
          color: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#006A4E] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
              <HelpCircle className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-800/80 text-[10px] font-bold uppercase tracking-wider text-emerald-200 border border-emerald-600/30">
                  {t('সহজ বাংলা গাইড', 'Plain Language Guide')}
                </span>
                <span className="text-xs text-emerald-200">•</span>
                <span className="text-xs text-emerald-100 font-medium">
                  ধাপ {toBanglaDigits(step, lang)} / {toBanglaDigits(3, lang)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {t('আপনার কী সাহায্য দরকার? — সমস্যা ভিত্তিক ডিজিটাল ভূমি গাইড', 'What help do you need? — Guided Land Service')}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* STEP 1: SELECT PROBLEM */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {t('১. আপনার সমস্যা বা কাঙ্ক্ষিত সেবা নির্বাচন করুন:', '1. Select your issue or desired service:')}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t(
                    'দপ্তরের জটিল আইনি পরিভাষা না জেনেও আপনার দৈনন্দিন ভাষার সমস্যাটি নির্বাচন করুন।',
                    'Choose the issue in plain language without needing to know official department codes.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {PROBLEMS.map((prob) => {
                  const isSelected = selectedProblem.id === prob.id;
                  return (
                    <div
                      key={prob.id}
                      onClick={() => setSelectedProblem(prob)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'border-[#006A4E] bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl shrink-0 p-1 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        {prob.icon}
                      </span>
                      <div className="space-y-1 flex-1">
                        <div className="font-bold text-xs text-slate-900 leading-snug">
                          {lang === 'bn' ? prob.titleBn : prob.titleEn}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Building2 className="w-3 h-3 text-[#006A4E]" />
                          <span>{lang === 'bn' ? prob.competentRoleBn : prob.competentRoleEn}</span>
                        </div>
                      </div>
                      <div className="shrink-0 mt-1">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#006A4E] bg-[#006A4E]' : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION DETAILS (RESIDENCE VS PROPERTY) */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#006A4E]" />
                  <span>{t('২. আপনার বাসস্থান এবং জমির অবস্থান নির্ধারণ করুন', '2. Set Your Residence vs Property Location')}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {t(
                    'গুরুত্বপূর্ণ নিয়ম: আপনি যেখানে বসবাস করেন (যেমন: ঢাকা) আর জমি যেখানে অবস্থিত (যেমন: কুমিল্লা), দুটি ভিন্ন জেলা হতে পারে। সেবাটি পরিচালিত হবে জমির এলাকার দায়িত্বপ্রাপ্ত দপ্তর থেকে।',
                    'Important: Your residence (e.g. Dhaka) and land location (e.g. Cumilla) are separated. Service jurisdiction belongs to the property location.'
                  )}
                </p>
              </div>

              {/* Residence Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>{t('আপনার বর্তমান বাসস্থান / বসবাসের জেলা:', 'Where You Currently Live (Residence):')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('বসবাসের জেলা', 'Residence District')}
                    </label>
                    <select
                      value={residenceDistrict}
                      onChange={(e) => setResidenceDistrict(e.target.value)}
                      className="w-full p-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
                    >
                      <option value="ঢাকা">ঢাকা (Dhaka)</option>
                      <option value="চট্টগ্রাম">চট্টগ্রাম (Chattogram)</option>
                      <option value="কুমিল্লা">কুমিল্লা (Cumilla)</option>
                      <option value="গাজীপুর">গাজীপুর (Gazipur)</option>
                      <option value="নারায়ণগঞ্জ">নারায়ণগঞ্জ (Narayanganj)</option>
                      <option value="অন্যান্য জেলা">অন্যান্য জেলা (Other District / Abroad)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {t('যোগাযোগের মোবাইল নম্বর', 'Contact Phone')}
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={user?.phone || user?.phone_dummy || '01700-001000'}
                      className="w-full p-2 rounded-xl border border-slate-200 bg-slate-100 text-xs text-slate-600 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Property Location Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <MapPin className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('জমির অবস্থান / অধিক্ষেত্র (যেখানে জমি অবস্থিত):', 'Where the Land is Located (Jurisdiction):')}</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dontKnowLocation}
                      onChange={(e) => setDontKnowLocation(e.target.checked)}
                      className="rounded text-[#006A4E]"
                    />
                    <span className="font-semibold">{t('আমি সঠিক অবস্থান জানি না', "I don't know exact location")}</span>
                  </label>
                </div>

                {!dontKnowLocation ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t('জেলা', 'District')}</label>
                      <select
                        value={propertyDistrict}
                        onChange={(e) => {
                          setPropertyDistrict(e.target.value);
                          if (e.target.value === 'কুমিল্লা') {
                            setPropertyUpazila('দাউদকান্দি');
                            setPropertyMouza('সুন্দরপুর');
                          } else if (e.target.value === 'ঢাকা') {
                            setPropertyUpazila('সাভার');
                            setPropertyMouza('বিরুলিয়া');
                          } else {
                            setPropertyUpazila('গাজীপুর সদর');
                            setPropertyMouza('বাসন');
                          }
                        }}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        <option value="কুমিল্লা">কুমিল্লা (Cumilla)</option>
                        <option value="ঢাকা">ঢাকা (Dhaka)</option>
                        <option value="গাজীপুর">গাজীপুর (Gazipur)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t('উপজেলা', 'Upazila')}</label>
                      <select
                        value={propertyUpazila}
                        onChange={(e) => setPropertyUpazila(e.target.value)}
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      >
                        {propertyDistrict === 'কুমিল্লা' ? (
                          <>
                            <option value="দাউদকান্দি">দাউদকান্দি (Daudkandi)</option>
                            <option value="কুমিল্লা আদর্শ সদর">কুমিল্লা আদর্শ সদর</option>
                          </>
                        ) : propertyDistrict === 'ঢাকা' ? (
                          <>
                            <option value="সাভার">সাভার (Savar)</option>
                            <option value="তেজগাঁও">তেজগাঁও (Tejgaon)</option>
                          </>
                        ) : (
                          <option value="গাজীপুর সদর">গাজীপুর সদর</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t('মৌজা', 'Mouza')}</label>
                      <input
                        type="text"
                        value={propertyMouza}
                        onChange={(e) => setPropertyMouza(e.target.value)}
                        placeholder="মৌজার নাম..."
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">{t('দাগ নং (ঐচ্ছিক)', 'Dag No (Opt)')}</label>
                      <input
                        type="text"
                        value={propertyDagNo}
                        onChange={(e) => setPropertyDagNo(e.target.value)}
                        placeholder="যেমন: ৪২০"
                        className="w-full p-2 rounded-xl border border-slate-300 bg-white font-semibold"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    {t(
                      'আপনি যদি সঠিক দাগ বা মৌজা না জানেন, তবে সিস্টেম স্বয়ংক্রিয়ভাবে আপনাকে একটি ভার্চুয়াল কেন্দ্রীয় রাজস্ব সহায়তা টিকিটে যুক্ত করবে। এনআইডি ও পিতা/স্বামীর নাম দিয়ে রেকর্ড অনুসন্ধান করা হবে।',
                      'If you do not know the exact plot/mouza, the system will route you to assisted triage where officials query records by NID and parentage.'
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: ACTIONABLE GUIDANCE, ATTENDANCE & SUBMISSION */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Top Banner: Competent Office Resolution */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-[#006A4E] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                      {t('চিহ্নিত উপযুক্ত দপ্তর', 'Competent Property Office')}
                    </span>
                    {resolvedOffice.code && (
                      <span className="font-mono text-xs text-emerald-200">
                        {resolvedOffice.code}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {resolvedOffice.nameBn}
                  </h3>
                  <p className="text-xs text-emerald-100 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>{resolvedOffice.addressBn}</span>
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-emerald-700/60 sm:pl-4">
                  <span className="text-[10px] text-emerald-200 block">{t('হেল্পলাইন ও যোগাযোগ', 'Contact')}</span>
                  <span className="text-sm font-bold font-mono text-white">{resolvedOffice.phone}</span>
                </div>
              </div>

              {/* Attendance Status Callout (Audit Priority S1/S8/S9) */}
              {(() => {
                const att = getAttendanceBadge(selectedProblem.attendanceStatus);
                return (
                  <div className={`p-4 rounded-2xl border ${att.color} space-y-2`}>
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <div className={`w-2.5 h-2.5 rounded-full ${att.dot} animate-pulse`} />
                      <span>{att.labelBn}</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      {lang === 'bn' ? selectedProblem.attendanceReasonBn : selectedProblem.attendanceReasonEn}
                    </p>
                  </div>
                );
              })()}

              {/* 3-Column Service Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {/* Col 1: Necessary Documents */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <FileText className="w-4 h-4 text-[#006A4E]" />
                    <span>{t('প্রয়োজনীয় কাগজপত্র', 'Required Documents')}</span>
                  </h4>
                  <ul className="space-y-1.5 text-slate-600 text-[11px]">
                    {(lang === 'bn' ? selectedProblem.documentsBn : selectedProblem.documentsEn).map((doc, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Col 2: Statutory Fees */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>{t('সরকারি প্রমিত ফি', 'Statutory Fees')}</span>
                  </h4>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-900 text-xs">
                    {lang === 'bn' ? selectedProblem.feeScheduleBn : selectedProblem.feeScheduleEn}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-start gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{lang === 'bn' ? selectedProblem.feeCircularBn : 'Official Circular Schedule'}</span>
                  </div>
                </div>

                {/* Col 3: Next Action & Steps */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>{t('পরবর্তী পদক্ষেপ ও সিদ্ধান্তকারী', 'Next Action & Deciding Role')}</span>
                  </h4>
                  <div className="text-[11px] text-slate-700 leading-relaxed">
                    <strong>{t('সিদ্ধান্ত গ্রহণকারী:', 'Deciding Authority:')}</strong>{' '}
                    {lang === 'bn' ? selectedProblem.competentRoleBn : selectedProblem.competentRoleEn}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>{t('অনলাইন ব্যবস্থা:', 'Channel:')}</strong>{' '}
                    {selectedProblem.serviceType === 'EXTERNAL_OFFICIAL' ? 'সরকারি পোর্টাল' : 'ভূমি সুরক্ষা প্ল্যাটফর্ম'}
                  </div>
                </div>
              </div>

              {/* Action Section: Land Claim Form OR Direct Portal Button */}
              {selectedProblem.id === 'LINK_PROPERTY' ? (
                <div className="p-4 rounded-2xl bg-white border-2 border-emerald-500/40 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-[#006A4E]" />
                    <h4 className="text-xs font-bold text-slate-900">
                      {t('সরাসরি জমি দাবি ও লিঙ্কিং আবেদন ফরম (এসি ল্যান্ড পর্যালোচনা)', 'Submit Land Claim to Competent AC Land')}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600">
                    {t(
                      `এই আবেদনটি সরাসরি ${resolvedOffice.nameBn}-এর সহকারী কমিশনার (ভূমি) এবং ইউনিয়ন ভূমি কর্মকর্তার ডকেটে প্রেরিত হবে।`,
                      `This claim will be dispatched directly to the docket of AC Land at ${resolvedOffice.nameEn}.`
                    )}
                  </p>

                  {claimSuccess ? (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 font-semibold space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{claimSuccess.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.('tickets');
                        }}
                        className="px-4 py-2 rounded-lg bg-[#006A4E] text-white font-bold cursor-pointer"
                      >
                        {t('টিকেটে ট্র্যাকিং দেখুন', 'Track Case in Tickets')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          {t('দাবির সপক্ষে বিবরণ বা বায়া দলিলের তথ্য:*', 'Claim Rationale & Deed Details:*')}
                        </label>
                        <textarea
                          rows={2}
                          value={claimNotes}
                          onChange={(e) => setClaimNotes(e.target.value)}
                          placeholder="উক্ত জমি আমার খরিদকৃত/পৈত্রিক সূত্রে প্রাপ্ত। দলিল নং ও খারিজ রেকর্ড নিরীক্ষা করে প্রোফাইলে যুক্ত করার অনুরোধ জানাচ্ছি..."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-[#006A4E]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={submittingClaim}
                          onClick={handleSubmitLandClaim}
                          className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>
                            {submittingClaim ? t('দাখিল হচ্ছে...', 'Submitting...') : t('এসি ল্যান্ড সমীপে জমি দাবি দাখিল করুন', 'Submit Claim to AC Land')}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {t('সেবা গ্রহণের অনুমোদিত মাধ্যম:', 'Authorized Service Portal:')}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {selectedProblem.officialRoute}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedProblem.officialRoute.startsWith('http') ? (
                      <a
                        href={selectedProblem.officialRoute}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('সরকারি পোর্টালে সেবা গ্রহণ', 'Open Official Portal')}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate?.(selectedProblem.officialRoute);
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{t('সেবা কার্যক্রমে প্রবেশ করুন', 'Proceed to Service')}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                {t('পূর্ববর্তী ধাপ', 'Previous Step')}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              {t('বন্ধ করুন', 'Close')}
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev + 1) as any)}
                className="px-6 py-2.5 rounded-xl bg-[#006A4E] hover:bg-[#00553e] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{t('পরবর্তী ধাপ', 'Next Step')}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {t('সম্পন্ন', 'Done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
