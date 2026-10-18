import React, { useState } from 'react';
import { HelpCircle, Info, X } from 'lucide-react';
import { useAppUI } from '../i18n';

export type JargonTermKey =
  | 'DCR'
  | 'KHATIAN'
  | 'MUTATION'
  | 'LIEN'
  | 'JL_NO'
  | 'DAG_NO'
  | 'BIOMETRIC'
  | 'ED25519'
  | 'FARAIZ'
  | 'MOUZA'
  | 'DEED'
  | 'NOC';

interface JargonDefinition {
  labelBn: string;
  labelEn: string;
  shortDescBn: string;
  shortDescEn: string;
  detailBn: string;
  detailEn: string;
  practicalTipBn: string;
  practicalTipEn: string;
}

export const JARGON_DICTIONARY: Record<JargonTermKey, JargonDefinition> = {
  DCR: {
    labelBn: 'দিসিআর (DCR)',
    labelEn: 'DCR (Duplicate Carbon Receipt)',
    shortDescBn: 'নামজারি ও রেকর্ড সংশোধন ফি পরিশোধের সরকারি রসিদ।',
    shortDescEn: 'Official government receipt for mutation and land record correction fee.',
    detailBn:
      'ডুপ্লিকেট কার্বন রসিদ (DCR) হলো ভূমি উন্নয়ন কর ও নামজারি ফি পরিশোধের চূড়ান্ত সরকারি প্রমাণপত্র। এতে কিউআর কোড ও ট্র্যাকিং নম্বর থাকে।',
    detailEn:
      'Duplicate Carbon Receipt (DCR) is the conclusive proof of government mutation fee payment, featuring a validation QR code and ledger audit tracking.',
    practicalTipBn:
      'নামজারি চূড়ান্ত হওয়ার পর অনলাইনে ডিসিআর ডাউনলোড করে প্রিন্ট কপি সংরক্ষণ করুন; এটি খতিয়ানের বৈধতার অবিচ্ছেদ্য অংশ।',
    practicalTipEn:
      'Always download and preserve the official DCR after mutation approval; it accompanies your corrected porcha.',
  },
  KHATIAN: {
    labelBn: 'খতিয়ান / পর্চা (Khatian)',
    labelEn: 'Khatian (Record of Rights)',
    shortDescBn: 'জমির চূড়ান্ত সরকারি স্বত্বলিপি ও মালিকানা রেকর্ড।',
    shortDescEn: 'Conclusive government Record of Rights proving land ownership.',
    detailBn:
      'খতিয়ানে জমির মালিকের নাম, দাগ নম্বর, জমির শ্রেণি, খতিয়ান নম্বর ও হিস্যা (অংশ) উল্লেখ থাকে। এটি সিএস, এসএ, আরএস ও বিএস জরিপ অনুযায়ী প্রস্তুত হয়।',
    detailEn:
      'The Khatian documents owner names, plot numbers, land classification, shares, and boundary history across CS, SA, RS, and BS surveys.',
    practicalTipBn:
      'জমি ক্রয়ের পূর্বে সর্বদা হালনাগাদ বিএস খতিয়ান ও নামজারি খতিয়ানের ধারাবাহিকতা যাচাই করুন।',
    practicalTipEn:
      'Before purchasing any property, always verify the unbroken chain of mutations up to the latest BS survey.',
  },
  MUTATION: {
    labelBn: 'ই-নামজারি / খারিজ (Mutation)',
    labelEn: 'E-Mutation (Ownership Record Update)',
    shortDescBn: 'পূর্বের মালিকের নাম কেটে নতুন মালিকের নামে রেকর্ডভুক্তি।',
    shortDescEn: 'Official substitution of new owner in government revenue records.',
    detailBn:
      'জমি কেনাবেচা বা উত্তরাধিকার সূত্রে পাওয়ার পর সহকারী কমিশনার (ভূমি) অফিসের মাধ্যমে নতুন মালিকের নামে খতিয়ান খোলার আইনি প্রক্রিয়া।',
    detailEn:
      'The administrative legal process executed by the Assistant Commissioner (Land) to record new ownership following purchase or inheritance.',
    practicalTipBn:
      'দলিল রেজিস্ট্রির পর নামজারি না করলে সরকারি রেকর্ডে মালিকানা কার্যকর হয় না এবং ভূমি উন্নয়ন কর দেওয়া যায় না।',
    practicalTipEn:
      'Without an approved mutation, title is incomplete in government revenue records and land development tax cannot be assessed in your name.',
  },
  LIEN: {
    labelBn: 'লিয়েন / বন্ধক (Mortgage Lien)',
    labelEn: 'Lien / Mortgage Encumbrance',
    shortDescBn: 'ব্যাংক ঋণের বিপরীতে জমিতে কার্যকর আইনি দায়বদ্ধতা।',
    shortDescEn: 'Financial encumbrance marked on property as security for bank credit.',
    detailBn:
      'জমি বন্ধক রেখে ব্যাংক বা আর্থিক প্রতিষ্ঠান থেকে ঋণ নেওয়া হলে সেই জমিতে লিয়েন মার্কিং করা থাকে, যাতে ঋণ পরিশোধ না হওয়া পর্যন্ত জমি হস্তান্তর বা বিক্রি না হতে পারে।',
    detailEn:
      'A legal encumbrance recorded by a bank or financial institution preventing the sale or transfer of mortgaged property until loan clearance.',
    practicalTipBn:
      'লিয়েনযুক্ত জমি ক্রয় করলে ঋণ খেলাপের দায় ক্রেতার ওপর বর্তাতে পারে; তাই ব্যাংকের এনওসি (NOC) নিশ্চিত করুন।',
    practicalTipEn:
      'Never purchase a property with an active lien without verifying a released state and official Bank NOC.',
  },
  JL_NO: {
    labelBn: 'জেএল নম্বর (JL No.)',
    labelEn: 'JL Number (Jurisdiction List)',
    shortDescBn: 'রাজস্ব মৌজার সরকারি ভৌগোলিক পরিচিতি নম্বর।',
    shortDescEn: 'Official serial identification number of a revenue mouza.',
    detailBn:
      'প্রতিটি উপজেলার অধীন প্রতিটি মৌজার জন্য সরকারিভাবে একটি নির্দিষ্ট জেএল (Jurisdiction List) নম্বর বরাদ্দ থাকে, যা ভূমি রেকর্ডের অন্যতম স্থায়ী সূচক।',
    detailEn:
      'Every cadastral revenue village (mouza) in an upazila has an assigned unique Jurisdiction List number used as an immutable land indexing key.',
    practicalTipBn:
      'দাগ ও খতিয়ানের সাথে সর্বদা সঠিক মৌজা ও জেএল নম্বর মিলিয়ে দেখুন।',
    practicalTipEn:
      'Cross-check the mouza name with its exact JL number on all documents to prevent boundary mismatch.',
  },
  DAG_NO: {
    labelBn: 'দাগ নম্বর (Plot / Dag No.)',
    labelEn: 'Dag Number (Cadastral Plot)',
    shortDescBn: 'মৌজা নকশায় প্রতিটি জমির খণ্ডের অনন্য নম্বর।',
    shortDescEn: 'Unique parcel boundary number on a revenue mouza map.',
    detailBn:
      'জরিপ মানচিত্রে জমির সীমানা অনুযায়ী প্রতিটি আলাদা প্লট বা জমি খণ্ডকে যে সংখ্যা দিয়ে চিহ্নিত করা হয় তাকে দাগ নম্বর বলে।',
    detailEn:
      'A unique number assigned to an individual land parcel within a cadastral survey map to establish its physical boundary and geography.',
    practicalTipBn:
      'সাবাবেক (পুরাতন) দাগ নম্বর ও হাল (বর্তমান) বিএস দাগ নম্বর আলাদা হতে পারে; হস্তান্তরে হাল দাগ আবশ্যক।',
    practicalTipEn:
      'Distinguish clearly between historical survey dag numbers and the current BS dag number.',
  },
  BIOMETRIC: {
    labelBn: 'বায়োমেট্রিক সম্মতি (Biometric Consent)',
    labelEn: 'Biometric Transaction Consent',
    shortDescBn: 'সাব-রেজিস্ট্রি কাউন্টারে আঙুলের ছাপ বা লাইভ ভেরিফিকেশন।',
    shortDescEn: 'Physical fingerprint/iris verification at sub-registry counter.',
    detailBn:
      'জমি রেজিস্ট্রেশনের সময় ভুয়া পরিচয় বা ছদ্মবেশ রোধে নির্বাচন কমিশনের এনআইডি ডাটাবেজের সাথে মিলিয়ে সাব-রেজিস্ট্রার কার্যালয়ে লাইভ আঙুলের ছাপ প্রদান।',
    detailEn:
      'Sovereign identity verification executed at the sub-registry counter matching physical thumbprints against the Election Commission NID database.',
    practicalTipBn:
      'অনলাইনে দলিল দাখিল সম্পন্ন হলেও চূড়ান্ত বায়োমেট্রিক ও স্বাক্ষরের জন্য সাব-রেজিস্ট্রি অফিসে উপস্থিতি আবশ্যক।',
    practicalTipEn:
      'Online drafting streamlines preparation, but mandatory physical attendance is legally required for deed execution.',
  },
  ED25519: {
    labelBn: 'Ed25519 ক্রিপ্টোগ্রাফিক স্বাক্ষর',
    labelEn: 'Ed25519 Cryptographic Seal',
    shortDescBn: 'ডিজিটাল রেকর্ডের গাণিতিক অপরিবর্তনীয় সুরক্ষা।',
    shortDescEn: 'Mathematical tamper-proof cryptographic signature.',
    detailBn:
      'ভূমি সুরক্ষা প্ল্যাটফর্মে প্রতিটি দলিলের হ্যাশ ও মেটাডাটা Ed25519 ক্রিপ্টোগ্রাফিক চাবিকাঠি দিয়ে সিল করা থাকে, ফলে পেছনের তারিখে বা ডাটাবেজে গোপনে কোনো তথ্য পরিবর্তনের সুযোগ থাকে না।',
    detailEn:
      'Each deed is hashed and signed with an Ed25519 cryptographic key, guaranteeing mathematical non-repudiation and tamper prevention.',
    practicalTipBn:
      'দলিলের কিউআর কোড স্ক্যান করলে সরাসরি এই ক্রিপ্টোগ্রাফিক স্বাক্ষরের বৈধতা যাচাই করা যায়।',
    practicalTipEn:
      'Scan the public deed QR code anytime to independently verify the Ed25519 cryptographic signature.',
  },
  FARAIZ: {
    labelBn: 'ফারায়েজ বণ্টন (Faraiz Inheritance)',
    labelEn: 'Faraiz (Islamic Estate Distribution)',
    shortDescBn: 'ওয়ারিশদের মাঝে শরিয়তসম্মত অংশের গাণিতিক হিসাব।',
    shortDescEn: 'Mathematical Islamic inheritance share calculation for legal heirs.',
    detailBn:
      'মৃত ব্যক্তির ওয়ারিশগণের (সন্তান, স্ত্রী, পিতামাতা ইত্যাদি) মাঝে ইসলামিক আইনের বিধান অনুযায়ী নির্ভুল ভগ্নাংশে জমির অংশ বণ্টন।',
    detailEn:
      'Statutory Islamic inheritance distribution calculating exact mathematical share fractions for legal heirs (spouse, children, parents).',
    practicalTipBn:
      'ওয়ারিশান জমি বিক্রয়ের পূর্বে যৌথ ফারায়েজ অনুযায়ী নিজের প্রাপ্য অংশ ও জমাভাগ নিশ্চিত করুন।',
    practicalTipEn:
      'Confirm your exact mathematical fraction via Faraiz calculation before offering inherited land for transfer.',
  },
  MOUZA: {
    labelBn: 'মৌজা (Cadastral Mouza)',
    labelEn: 'Mouza (Revenue Village)',
    shortDescBn: 'ভূমি রাজস্বের সর্বনিম্ন ভৌগোলিক একক।',
    shortDescEn: 'The lowest revenue boundary unit in land administration.',
    detailBn:
      'একটি মৌজার মধ্যে বহু দাগ বা প্লট অন্তর্ভুক্ত থাকে। প্রতিটি মৌজার আলাদা জরিপ ম্যাপ ও খতিয়ান ভলিউম পরিচালিত হয়।',
    detailEn:
      'A revenue village containing individual survey parcels (dags) with designated revenue boundaries.',
    practicalTipBn:
      'নাম একই হলেও থানা বা জেলাভেদে মৌজা আলাদা হতে পারে, তাই জেএল নম্বর মিলিয়ে নিন।',
    practicalTipEn:
      'Always verify the upazila and JL number as mouza names can repeat across jurisdictions.',
  },
  DEED: {
    labelBn: 'দলিল (Deed / Kobala)',
    labelEn: 'Deed (Registered Instrument)',
    shortDescBn: 'সাব-রেজিস্ট্রি অফিসে নিবন্ধিত আইনগত হস্তান্তরপত্র।',
    shortDescEn: 'Statutory registered instrument transferring title from grantor to grantee.',
    detailBn:
      'জমি বিক্রয় (কবলা), হেবা (দান), এওয়াজ বা বণ্টনের জন্য সাব-রেজিস্ট্রারের সম্মুখে সম্পাদিত ও স্ট্যাম্পযুক্ত আইনগত চুক্তিপত্র।',
    detailEn:
      'A stamped, legally executed instrument of sale, gift (Heba), or exchange sealed by the Sub-Registrar.',
    practicalTipBn:
      'দলিল রেজিস্ট্রির সাথে সাথেই দলিল নম্বর ও তারিখের নোট রাখুন এবং নামজারির জন্য আবেদন করুন।',
    practicalTipEn:
      'Record your registered deed volume and serial immediately to initiate mutation.',
  },
  NOC: {
    labelBn: 'এনওসি (No Objection Certificate)',
    labelEn: 'NOC (Bank Clearance Certificate)',
    shortDescBn: 'ব্যাংক বা কর্তৃপক্ষের অনাপত্তিপত্র।',
    shortDescEn: 'Official certificate confirming mortgage release or clearance.',
    detailBn:
      'ঋণ পরিশোধিত হওয়ার পর ব্যাংক কর্মকর্তা কর্তৃক ইস্যুকৃত ডিজিটাল সনদ, যা প্রত্যয়ন করে যে উক্ত দাগ বা জমিতে ব্যাংকের কোনো দাবি নেই।',
    detailEn:
      'Digital certificate issued by a scheduled bank verifying that loan obligations have been fulfilled and the mortgage lien is released.',
    practicalTipBn:
      'ব্যাংক বন্ধকযুক্ত জমি ক্রয়ের আগে এই প্ল্যাটফর্মে এনওসির সত্যতা কিউআর স্ক্যান করে নিন।',
    practicalTipEn:
      'Verify the QR seal on any bank NOC directly on this portal before completing payment.',
  },
};

export const JargonTooltip: React.FC<{
  term: JargonTermKey;
  children?: React.ReactNode;
  className?: string;
}> = ({ term, children, className = '' }) => {
  const { lang, t } = useAppUI();
  const [isOpen, setIsOpen] = useState(false);
  const def = JARGON_DICTIONARY[term];

  if (!def) return <>{children}</>;

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center gap-0.5 border-b border-dotted border-emerald-600/60 hover:border-emerald-800 text-slate-800 hover:text-emerald-800 cursor-help transition-colors select-none ${className}`}
        title={lang === 'bn' ? def.shortDescBn : def.shortDescEn}
      >
        <span>{children || (lang === 'bn' ? def.labelBn : def.labelEn)}</span>
        <HelpCircle className="w-3 h-3 text-emerald-600/70 shrink-0 opacity-80 hover:opacity-100" />
      </span>

      {/* Lightweight Explanatory Modal on Click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 text-[#006A4E] flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {lang === 'bn' ? def.labelBn : def.labelEn}
                  </h4>
                  <p className="text-xs text-emerald-700 font-medium">
                    {t('ভূমি পরিভাষা ও সহজ ব্যাখ্যা', 'Land Terminology & Plain Guidance')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p className="font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {lang === 'bn' ? def.shortDescBn : def.shortDescEn}
              </p>
              <p>{lang === 'bn' ? def.detailBn : def.detailEn}</p>

              {/* Practical Tip */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-1">
                <span className="font-bold text-[11px] uppercase tracking-wider block text-amber-800">
                  {t('💡 বাস্তব পরামর্শ ও সতর্কতা:', '💡 Practical Tip:')}
                </span>
                <span className="text-xs">{lang === 'bn' ? def.practicalTipBn : def.practicalTipEn}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                {t('বুঝেছি', 'Got it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
