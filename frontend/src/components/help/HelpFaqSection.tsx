import React from 'react';
import { ArrowRight, HelpCircle, PhoneCall } from 'lucide-react';
import { useAppUI } from '../../i18n';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { EmptyState } from '@/components/admin/kit';

interface Faq {
  id: string;
  q_bn: string;
  q_en: string;
  a_bn: string;
  a_en: string;
  /** optional next step: a page (onNavigate) or a help tab (tab:xxx) */
  go?: { to: string; bn: string; en: string };
}

export const FAQS: Faq[] = [
  {
    id: 'check',
    q_bn: 'জমি কেনার আগে কী যাচাই করব?',
    q_en: 'What should I check before buying land?',
    a_bn: 'দাগ নম্বর ও বিক্রেতার নাম দিয়ে “জমি যাচাই” করুন। আসল মালিক, বন্ধক, মামলা আর আগে বিক্রি হয়েছে কি না দেখা যাবে।',
    a_en: 'Use “Check land” with the plot number and seller. You will see the real owner, mortgages, court cases and earlier sales.',
    go: { to: 'check', bn: 'জমি যাচাই', en: 'Check land' },
  },
  {
    id: 'deed',
    q_bn: 'দলিল আসল কি না কীভাবে বুঝব?',
    q_en: 'How do I know a deed is genuine?',
    a_bn: 'দলিলের QR কোড স্ক্যান করুন অথবা দলিল নম্বর দিন। আসল হলে সবুজ চিহ্ন দেখাবে।',
    a_en: 'Scan the QR code on the deed or type the deed number. A genuine deed shows a green mark.',
    go: { to: 'qr', bn: 'দলিল যাচাই', en: 'Verify deed' },
  },
  {
    id: 'mutation',
    q_bn: 'নামজারি কী? কখন করতে হয়?',
    q_en: 'What is mutation? When is it needed?',
    a_bn: 'সরকারি খতিয়ানে নিজের নাম তোলাকে নামজারি বলে। জমি কেনা বা ওয়ারিশ সূত্রে পাওয়ার পর দ্রুত আবেদন করুন।',
    a_en: 'Mutation puts your name in the government record. Apply soon after buying or inheriting land.',
  },
  {
    id: 'mutation-fee',
    q_bn: 'নামজারিতে কত টাকা লাগে?',
    q_en: 'How much does mutation cost?',
    a_bn: 'মোট ১,১৭০ টাকা। আবেদনের সময় ৭০ টাকা, অনুমোদনের পর ১,১০০ টাকা (ডিসিআর)।',
    a_en: '1,170 taka in total: 70 taka when applying, 1,100 taka (DCR) after approval.',
    go: { to: 'tab:fees', bn: 'ফি হিসাব', en: 'Fee calculator' },
  },
  {
    id: 'porcha',
    q_bn: 'খতিয়ানের কপি (পরচা) কীভাবে পাব?',
    q_en: 'How do I get a khatian copy (porcha)?',
    a_bn: 'অনলাইনে আবেদন করুন। সরকারি ফি ১০০ টাকা, সাথে ২০ টাকা অনলাইন চার্জ।',
    a_en: 'Apply online. The government fee is 100 taka plus a 20 taka online charge.',
    go: { to: 'tab:fees', bn: 'ফি হিসাব', en: 'Fee calculator' },
  },
  {
    id: 'lock',
    q_bn: 'বিক্রয় লক কী?',
    q_en: 'What is a sale lock?',
    a_bn: 'মালিক নিজের জমি অনলাইনে লক করে রাখতে পারেন। লক থাকলে কেউ ওই জমির দলিল রেজিস্ট্রি করতে পারবে না।',
    a_en: 'An owner can lock their land online. While locked, nobody can register a deed for it.',
  },
  {
    id: 'heir',
    q_bn: 'ওয়ারিশের জমি কীভাবে বিক্রি করব?',
    q_en: 'How do I sell inherited land?',
    a_bn: 'আগে ওয়ারিশ সনদ ও বণ্টননামা করুন। একজন ওয়ারিশ একা পুরো জমি বিক্রি করতে পারেন না।',
    a_en: 'First get a succession certificate and a partition deed. One heir cannot sell the whole plot alone.',
  },
  {
    id: 'error',
    q_bn: 'খতিয়ানে নাম ভুল হলে কী করব?',
    q_en: 'My name is wrong in the khatian. What now?',
    a_bn: 'উপজেলা ভূমি অফিসে সংশোধনের আবেদন করুন। এনআইডি ও পুরনো খতিয়ান সাথে নিন।',
    a_en: 'Apply for a correction at the upazila land office. Bring your NID and the old khatian.',
    go: { to: 'offices', bn: 'অফিস খুঁজুন', en: 'Find office' },
  },
  {
    id: 'mortgage',
    q_bn: 'ব্যাংকে বন্ধক থাকা জমি কেনা যায়?',
    q_en: 'Can I buy land that is mortgaged to a bank?',
    a_bn: 'না। ঋণ শোধের পর ব্যাংকের ছাড়পত্র (NOC) লাগবে। ছাড়পত্রটি এখানে যাচাই করুন।',
    a_en: 'No. After the loan is repaid, the bank must give a clearance (NOC). Verify it here.',
    go: { to: 'qr?kind=noc', bn: 'ছাড়পত্র যাচাই', en: 'Verify NOC' },
  },
  {
    id: 'cash',
    q_bn: 'কাউকে নগদ টাকা দিতে হবে?',
    q_en: 'Do I have to pay anyone in cash?',
    a_bn: 'না। সব সরকারি ফি অনলাইনে বা সরকারি চালানে দিন। দালালকে টাকা দেবেন না।',
    a_en: 'No. Pay all government fees online or by government chalan. Never pay a middleman.',
  },
];

/** Search FAQ questions and answers in both languages. */
export const matchFaq = (query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return FAQS;
  return FAQS.filter((f) => [f.q_bn, f.q_en, f.a_bn, f.a_en].some((v) => v.toLowerCase().includes(q)));
};

export const HelpFaqSection: React.FC<{
  query?: string;
  onNavigate: (tab: string) => void;
  onTab: (tab: string) => void;
}> = ({ query = '', onNavigate, onTab }) => {
  const { t, lang } = useAppUI();
  const items = matchFaq(query);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={HelpCircle}
        text={t('কোনো উত্তর পাওয়া যায়নি', 'No answer found')}
        action={
          <a href="tel:16122" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-[#006A4E] hover:bg-emerald-50">
            <PhoneCall className="size-4" />
            {t('১৬১২২ এ জিজ্ঞাসা করুন', 'Ask 16122')}
          </a>
        }
      />
    );
  }

  return (
    <Accordion type="single" collapsible className="grid gap-2 lg:grid-cols-2 lg:items-start">
      {items.map((f) => (
        <AccordionItem key={f.id} value={f.id} className="rounded-xl border border-slate-200 bg-white px-4 data-[state=open]:border-[#006A4E]/40">
          <AccordionTrigger className="py-3.5 text-left text-[15px] font-medium text-slate-900 hover:no-underline cursor-pointer">
            {lang === 'bn' ? f.q_bn : f.q_en}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-slate-600">
            <p>{lang === 'bn' ? f.a_bn : f.a_en}</p>
            {f.go && (
              <button
                type="button"
                onClick={() => (f.go!.to.startsWith('tab:') ? onTab(f.go!.to.slice(4)) : onNavigate(f.go!.to))}
                className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-sm font-medium text-[#006A4E] hover:bg-emerald-100 cursor-pointer"
              >
                {lang === 'bn' ? f.go.bn : f.go.en}
                <ArrowRight className="size-4" />
              </button>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
