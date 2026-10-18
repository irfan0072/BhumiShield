import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Shield,
  QrCode,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Printer,
  Sparkles,
  AlertTriangle,
  Info,
  Building,
  Eye,
  Check,
} from 'lucide-react';
import { BhumiApi } from '../../api/client';
import { toBanglaDigits } from '../../theme/tokens';

interface DocumentSecurityConfig {
  enable_custom_watermark: boolean;
  watermark_text_bn: string;
  watermark_text_en: string;
  watermark_opacity: number;
  watermark_angle_deg: number;
  watermark_pattern: 'DIAGONAL_SINGLE' | 'REPEATED_TILES' | 'CENTER_SEAL';
  enable_qr_validation_seal: boolean;
  qr_layout_style: 'GOV_SEAL_BORDERED' | 'CRYPTO_HASH_BADGE' | 'MINIMAL_HEADER';
  qr_position: 'HEADER_RIGHT' | 'FOOTER_CENTER' | 'SEAL_OVERLAY';
  qr_verification_url_prefix: string;
  show_cryptographic_hash: boolean;
  show_issuing_authority_signature: boolean;
  show_tamper_warning_text: boolean;
  tamper_warning_text_bn: string;
  tamper_warning_text_en: string;
  dcr_fee_breakdown_visible: boolean;
  porcha_ownership_shares_visible: boolean;
  updated_at?: string;
  updated_by?: string;
}

const DEFAULT_CONFIG: DocumentSecurityConfig = {
  enable_custom_watermark: true,
  watermark_text_bn: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার - ভূমি মন্ত্রণালয় - শুধুমাত্র নাগরিক ব্যবহারের জন্য সংরক্ষিত',
  watermark_text_en: 'GOVERNMENT OF BANGLADESH - MINISTRY OF LAND - CITIZEN OFFICIAL COPY',
  watermark_opacity: 0.14,
  watermark_angle_deg: -30,
  watermark_pattern: 'DIAGONAL_SINGLE',
  enable_qr_validation_seal: true,
  qr_layout_style: 'GOV_SEAL_BORDERED',
  qr_position: 'HEADER_RIGHT',
  qr_verification_url_prefix: '/verify-deed-qr',
  show_cryptographic_hash: true,
  show_issuing_authority_signature: true,
  show_tamper_warning_text: true,
  tamper_warning_text_bn: 'এই ডিজিটাল নথিটি ভূমিশিল্ডের ক্রিপ্টোগ্রাফিক সুরক্ষা চেইনের অধীনে অনুমোদিত। কিউআর কোড স্ক্যান করে অনলাইন ডাটাবেসের সাথে অখণ্ডতা যাচাই করুন। অননুমোদিত রদবদল ফৌজদারি অপরাধ হিসেবে গণ্য হবে।',
  tamper_warning_text_en: 'This digital record is cryptographically signed under BhumiShield sovereign chain. Scan QR code to verify live status. Tampering is punishable under penal code.',
  dcr_fee_breakdown_visible: true,
  porcha_ownership_shares_visible: true,
};

interface SuperAdminDocumentSecurityTabProps {
  t: (bn: string, en: string) => string;
  lang: 'bn' | 'en';
}

export const SuperAdminDocumentSecurityTab: React.FC<SuperAdminDocumentSecurityTabProps> = ({ t, lang }) => {
  const [config, setConfig] = useState<DocumentSecurityConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; err?: boolean } | null>(null);
  const [previewTab, setPreviewTab] = useState<'DCR' | 'PORCHA'>('DCR');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await BhumiApi.getDocumentSecurityConfig();
      if (res && res.config) {
        setConfig(res.config);
      }
    } catch (err: any) {
      console.warn('Could not fetch document security config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const res = await BhumiApi.updateDocumentSecurityConfig(config);
      if (res && res.config) {
        setConfig(res.config);
      }
      setNotice({
        msg: res?.message_bn || t('ডিজিটাল ডিসিআর ও খতিয়ান পর্চা ওয়াটারমার্ক ও কিউআর লেআউট সফলভাবে সংরক্ষিত হয়েছে।', 'Configuration saved successfully.'),
        err: false,
      });
    } catch (err: any) {
      const msg = err.response?.data?.message_bn || err.message || t('সংরক্ষণ ব্যর্থ হয়েছে।', 'Failed to save configuration.');
      setNotice({ msg, err: true });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_CONFIG });
    setNotice({
      msg: t('ডিফল্ট কনফিগারেশন লোড করা হয়েছে। প্রয়োগ করতে সংরক্ষণ করুন।', 'Default configuration loaded. Click save to apply.'),
      err: false,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Notice Alert */}
      {notice && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition shadow-xs ${
            notice.err
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-[#006A4E]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.err ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            <span>{notice.msg}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#006A4E] text-[11px] font-bold">
              {t('সুপার অ্যাডমিন সার্ভিস কনফিগারেশন', 'Super Admin Service Configuration')}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {t('নাগরিক সেবা ডেলিভারি নিরাপত্তা', 'Citizen Service Delivery Security')}
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#006A4E]">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <span>
              {t(
                'ডিজিটাল ডিসিআর (DCR) ও বিএস খতিয়ান পর্চা ওয়াটারমার্ক ও কিউআর লেআউট নিয়ন্ত্রণ',
                'Digital DCR & BS Khatian Porcha Watermark & QR Layout Governance'
              )}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            {t(
              'বিএস খতিয়ান হস্তান্তর সম্পন্ন হওয়ার পর নাগরিক ড্যাশবোর্ডে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত ডিজিটাল ডিসিআর (Duplicate Carbon Receipt) ও খতিয়ান পর্চায় কাস্টম ওয়াটারমার্ক, ক্রিপ্টোগ্রাফিক কিউআর ভ্যালিডেশন লেআউট ও নিরাপত্তা সিল কনফিগার করুন।',
              'Configure custom security watermark, cryptographic QR verification seals, and tamper-evident layout for automatically generated digital DCR and BS Khatian Porcha upon transfer completion.'
            )}
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('রিফ্রেশ', 'Refresh')}</span>
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 transition cursor-pointer"
          >
            <span>{t('ডিফল্ট মান', 'Reset Defaults')}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:bg-slate-300"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
            <span>{saving ? t('সংরক্ষণ হচ্ছে...', 'Saving...') : t('কনফিগারেশন সংরক্ষণ করুন', 'Save Configuration')}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Controls on Left, Live Document Preview on Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Config Controls (7 cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Card 1: Custom Watermark Controls */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {t('১. কাস্টম ওয়াটারমার্ক ও নিরাপত্তা জলছাপ', '1. Custom Watermark & Background Security')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('জালিয়াতি ও অননুমোদিত ফটোকপি রোধে ব্যাকগ্রাউন্ডে জলছাপ প্রদর্শন', 'Tamper protection via background watermarks')}
                  </p>
                </div>
              </div>

              {/* Master Watermark Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enable_custom_watermark}
                  onChange={(e) => setConfig({ ...config, enable_custom_watermark: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006A4E]"></div>
                <span className="text-xs font-bold text-slate-700">
                  {config.enable_custom_watermark ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Disabled')}
                </span>
              </label>
            </div>

            {config.enable_custom_watermark ? (
              <div className="space-y-4 pt-1 animate-fadeIn">
                {/* Text BN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('ওয়াটারমার্ক টেক্সট (বাংলা)*', 'Watermark Text (Bengali)*')}
                  </label>
                  <input
                    type="text"
                    value={config.watermark_text_bn}
                    onChange={(e) => setConfig({ ...config, watermark_text_bn: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006A4E]"
                    placeholder="যেমন: গণপ্রজাতন্ত্রী বাংলাদেশ সরকার - ভূমি মন্ত্রণালয়"
                  />
                </div>

                {/* Text EN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t('ওয়াটারমার্ক টেক্সট (ইংরেজি)*', 'Watermark Text (English)*')}
                  </label>
                  <input
                    type="text"
                    value={config.watermark_text_en}
                    onChange={(e) => setConfig({ ...config, watermark_text_en: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-[#006A4E]"
                    placeholder="e.g. GOVERNMENT OF BANGLADESH - MINISTRY OF LAND"
                  />
                </div>

                {/* Grid: Opacity, Angle, Pattern */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Opacity Slider */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>{t('দৃশ্যমানতা (Opacity)', 'Opacity')}</span>
                      <span className="text-[#006A4E] font-mono">
                        {toBanglaDigits(Math.round(config.watermark_opacity * 100), lang)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.40"
                      step="0.02"
                      value={config.watermark_opacity}
                      onChange={(e) => setConfig({ ...config, watermark_opacity: parseFloat(e.target.value) })}
                      className="w-full accent-[#006A4E] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>{t('হালকা (৫%)', 'Light')}</span>
                      <span>{t('গাঢ় (৪০%)', 'Bold')}</span>
                    </div>
                  </div>

                  {/* Watermark Angle */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('জলছাপের কোণ (Angle)', 'Watermark Angle')}
                    </label>
                    <select
                      value={config.watermark_angle_deg}
                      onChange={(e) => setConfig({ ...config, watermark_angle_deg: parseInt(e.target.value, 10) })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value={-45}>{t('কোণাকুণি (-৪৫° ডায়াগোনাল)', 'Diagonal (-45°)')}</option>
                      <option value={-30}>{t('স্ট্যান্ডার্ড তির্যক (-৩০°)', 'Standard (-30°)')}</option>
                      <option value={0}>{t('সমান্তরাল অনুভূমিক (০°)', 'Horizontal (0°)')}</option>
                    </select>
                  </div>

                  {/* Watermark Pattern */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      {t('প্যাটার্ন শৈলী (Pattern)', 'Pattern Style')}
                    </label>
                    <select
                      value={config.watermark_pattern}
                      onChange={(e) => setConfig({ ...config, watermark_pattern: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="DIAGONAL_SINGLE">{t('একক তির্যক সিল', 'Single Center Seal')}</option>
                      <option value="REPEATED_TILES">{t('পুনরাবৃত্ত নিরাপত্তা প্যাটার্ন', 'Repeated Matrix')}</option>
                      <option value="CENTER_SEAL">{t('কেন্দ্রীয় গোল প্রতীক', 'Emblem Stamp')}</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
                {t(
                  'কাস্টম ওয়াটারমার্ক বর্তমানে নিষ্ক্রিয়। ডিসিআর ও খতিয়ানে কোনো অতিরিক্ত ব্যাকগ্রাউন্ড জলছাপ থাকবে না।',
                  'Custom watermark is currently disabled. Records will print with clean white background.'
                )}
              </div>
            )}
          </div>

          {/* Card 2: QR Validation Layout Controls */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {t('২. কিউআর ভ্যালিডেশন লেআউট ও অবস্থান', '2. QR Validation Layout & Position')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {t('সরকারি ডাটাবেস ভ্যালিডেশন লিংক ও ক্রিপ্টোগ্রাফিক কিউআর লেআউট', 'Ed25519 hash validation & visual seal layout')}
                  </p>
                </div>
              </div>

              {/* Master QR Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.enable_qr_validation_seal}
                  onChange={(e) => setConfig({ ...config, enable_qr_validation_seal: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006A4E]"></div>
                <span className="text-xs font-bold text-slate-700">
                  {config.enable_qr_validation_seal ? t('সক্রিয়', 'Active') : t('নিষ্ক্রিয়', 'Disabled')}
                </span>
              </label>
            </div>

            {config.enable_qr_validation_seal ? (
              <div className="space-y-4 pt-1 animate-fadeIn">
                {/* QR Layout Style Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    {t('কিউআর ভ্যালিডেশন লেআউট স্টাইল নির্বাচন করুন*', 'Select QR Validation Layout Style*')}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Style 1: Bordered Gov Seal */}
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, qr_layout_style: 'GOV_SEAL_BORDERED' })}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        config.qr_layout_style === 'GOV_SEAL_BORDERED'
                          ? 'border-[#006A4E] bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">
                          {t('সরকারি সিল ও বর্ডার', 'Official Seal & Border')}
                        </span>
                        {config.qr_layout_style === 'GOV_SEAL_BORDERED' && (
                          <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t('জাতীয় প্রতীকের বৃত্তাকার সিল, সোনালি বর্ডার ও ভেরিফিকেশন কোড', 'National seal, green/gold frame & verification token')}
                      </p>
                    </button>

                    {/* Style 2: Crypto Hash Badge */}
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, qr_layout_style: 'CRYPTO_HASH_BADGE' })}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        config.qr_layout_style === 'CRYPTO_HASH_BADGE'
                          ? 'border-[#006A4E] bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">
                          {t('ক্রিপ্টোগ্রাফিক হ্যাশ ব্যাজ', 'Cryptographic Hash Badge')}
                        </span>
                        {config.qr_layout_style === 'CRYPTO_HASH_BADGE' && (
                          <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t('SHA-256 ফিঙ্গারপ্রিন্ট, টাইমস্ট্যাম্প ও এন্টারপ্রাইজ ক্রিপ্টো সিল', 'SHA-256 fingerprint, blockchain ledger seal')}
                      </p>
                    </button>

                    {/* Style 3: Minimal Header */}
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, qr_layout_style: 'MINIMAL_HEADER' })}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        config.qr_layout_style === 'MINIMAL_HEADER'
                          ? 'border-[#006A4E] bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900">
                          {t('ন্যূনতম হেডার ভ্যালিডেশন', 'Minimal Header Badge')}
                        </span>
                        {config.qr_layout_style === 'MINIMAL_HEADER' && (
                          <CheckCircle2 className="w-4 h-4 text-[#006A4E]" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {t('কমপ্যাক্ট কিউআর কোড ও অনলাইন স্ক্যান নির্দেশনা', 'Compact modern QR footprint with direct scan prompt')}
                      </p>
                    </button>
                  </div>
                </div>

                {/* QR Position & URL Prefix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('কিউআর কোডের অবস্থান (Position)', 'QR Code Position')}
                    </label>
                    <select
                      value={config.qr_position}
                      onChange={(e) => setConfig({ ...config, qr_position: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                    >
                      <option value="HEADER_RIGHT">{t('শীর্ষ ডান কোণে (Header Right)', 'Top Right Header')}</option>
                      <option value="FOOTER_CENTER">{t('পাদচরণ কেন্দ্রে (Footer Center)', 'Bottom Center Footer')}</option>
                      <option value="SEAL_OVERLAY">{t('জলছাপের কেন্দ্রস্থলে (Emblem Center)', 'Center Watermark Overlay')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {t('ভ্যালিডেশন লিঙ্ক প্রিফিক্স (URL Path)', 'Verification URL Prefix')}
                    </label>
                    <input
                      type="text"
                      value={config.qr_verification_url_prefix}
                      onChange={(e) => setConfig({ ...config, qr_verification_url_prefix: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800"
                      placeholder="/verify-deed-qr"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Card 3: Additional Legal & Security Toggles */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="w-4 h-4 text-[#006A4E]" />
              <span>{t('৩. আইনি প্রমাণক ও প্রিন্ট সুরক্ষা ফিল্ডসমূহ', '3. Legal Evidentiary & Print Safeguards')}</span>
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={config.show_cryptographic_hash}
                  onChange={(e) => setConfig({ ...config, show_cryptographic_hash: e.target.checked })}
                  className="rounded text-[#006A4E] focus:ring-emerald-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">
                    {t('ক্রিপ্টোগ্রাফিক SHA-256 অডিট হ্যাশ প্রদর্শন', 'Print Cryptographic SHA-256 Audit Hash')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('নথিটির প্রতিটি অক্ষরের গাণিতিক ডিজিটাল ফিঙ্গারপ্রিন্ট প্রিন্ট কপিতে অন্তর্ভুক্ত হবে', 'Includes verifiable ledger fingerprint on generated PDF')}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={config.show_issuing_authority_signature}
                  onChange={(e) => setConfig({ ...config, show_issuing_authority_signature: e.target.checked })}
                  className="rounded text-[#006A4E] focus:ring-emerald-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">
                    {t('সহকারী কমিশনার (ভূমি)-এর নামজারি স্বাক্ষর ও সিল', 'AC Land Signature & Official Seal')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('উপজেলা ভূমি অফিসের ডিজিটাল অনুমোদনের সত্যায়িত স্বাক্ষর ও সিল থাকবে', 'Displays digital official stamp of AC Land and Sub-Registry')}
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition">
                <input
                  type="checkbox"
                  checked={config.show_tamper_warning_text}
                  onChange={(e) => setConfig({ ...config, show_tamper_warning_text: e.target.checked })}
                  className="rounded text-[#006A4E] focus:ring-emerald-500 w-4 h-4"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800">
                    {t('জালিয়াতি প্রতিরোধ সংক্রান্ত আইনি সতর্কবার্তা', 'Tamper-evident Penal Notice')}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {t('দণ্ডবিধির আওতায় অননুমোদিত রদবদল সংক্রান্ত আইনগত নোটিশ প্রদর্শন', 'Displays legal warning regarding falsification of government records')}
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Realtime Live Preview (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  {t('লাইভ প্রিভিউ (নাগরিকের চোখে)', 'Live Citizen Preview')}
                </span>
              </div>

              {/* Toggle DCR vs Porcha */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPreviewTab('DCR')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    previewTab === 'DCR' ? 'bg-[#006A4E] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('ডিজিটাল ডিসিআর (DCR)', 'Digital DCR')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('PORCHA')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    previewTab === 'PORCHA' ? 'bg-[#006A4E] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t('বিএস খতিয়ান পর্চা', 'BS Porcha')}
                </button>
              </div>
            </div>

            {/* Simulated A4 Document Container */}
            <div className="bg-white text-slate-900 rounded-2xl p-5 shadow-2xl relative overflow-hidden min-h-[500px] border-4 border-emerald-800/80 font-serif">
              {/* Dynamic Watermark Layer */}
              {config.enable_custom_watermark && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                  style={{
                    opacity: config.watermark_opacity,
                    transform: `rotate(${config.watermark_angle_deg}deg)`,
                  }}
                >
                  {config.watermark_pattern === 'REPEATED_TILES' ? (
                    <div className="grid grid-cols-2 gap-12 text-center text-emerald-950 font-black text-sm tracking-widest leading-loose">
                      <div>{config.watermark_text_bn}</div>
                      <div>{config.watermark_text_en}</div>
                      <div>{config.watermark_text_bn}</div>
                      <div>{config.watermark_text_en}</div>
                    </div>
                  ) : (
                    <div className="text-center text-emerald-950 font-black text-xl tracking-wider leading-relaxed px-4">
                      <div>{config.watermark_text_bn}</div>
                      <div className="text-sm font-sans tracking-widest mt-2">{config.watermark_text_en}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Document Header */}
              <div className="relative z-10 space-y-3">
                <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-emerald-900 flex items-center justify-center text-emerald-900 font-bold text-xs bg-emerald-50 shrink-0">
                      বাংলাদেশ
                    </div>
                    <div>
                      <div className="text-[11px] font-sans font-bold text-emerald-900 uppercase tracking-wider">
                        গণপ্রজাতন্ত্রী বাংলাদেশ সরকার
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {previewTab === 'DCR'
                          ? 'ভূমি রাজস্ব আদায়ের দাখিলা ও ডিসিআর (DCR)'
                          : 'স্বত্বলিপি ও চূড়ান্ত বিএস খতিয়ান পর্চা (BS Porcha)'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-sans">
                        উপজেলা ভূমি অফিস, সাভার, ঢাকা · ভূমি মন্ত্রণালয়
                      </div>
                    </div>
                  </div>

                  {/* QR Code Seal (When positioned HEADER_RIGHT) */}
                  {config.enable_qr_validation_seal && config.qr_position === 'HEADER_RIGHT' && (
                    <div
                      className={`p-2 rounded-xl shrink-0 text-center ${
                        config.qr_layout_style === 'GOV_SEAL_BORDERED'
                          ? 'border-2 border-emerald-800 bg-emerald-50/70 shadow-xs'
                          : config.qr_layout_style === 'CRYPTO_HASH_BADGE'
                          ? 'border-2 border-slate-800 bg-slate-900 text-white shadow-md'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      <div className="w-14 h-14 bg-slate-950 rounded-lg flex items-center justify-center text-white mx-auto p-1 font-mono text-[9px]">
                        <QrCode className="w-12 h-12 text-emerald-400" />
                      </div>
                      <div
                        className={`text-[8px] font-bold mt-1 uppercase font-sans ${
                          config.qr_layout_style === 'CRYPTO_HASH_BADGE' ? 'text-emerald-300' : 'text-emerald-900'
                        }`}
                      >
                        {t('সরকারি যাচাই সিল', 'Gov Verified')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Body Content: DCR vs Porcha */}
                {previewTab === 'DCR' ? (
                  <div className="space-y-3 text-xs font-sans">
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-500 block">রসিদ নম্বর:</span>
                        <span className="font-bold font-mono text-slate-900">DCR-2026-000101</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">ই-নামজারি কেস নং:</span>
                        <span className="font-bold font-mono text-[#006A4E]">MUT-SAV-2026-101</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">দাখিলকারী / ক্রেতা:</span>
                        <span className="font-bold text-slate-900">মো: রহিম উদ্দিন সরকার</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">এনআইডি নম্বর:</span>
                        <span className="font-bold font-mono text-slate-900">19852691234567890</span>
                      </div>
                    </div>

                    <table className="w-full text-left text-[11px] border border-slate-200">
                      <thead className="bg-emerald-900 text-white font-bold">
                        <tr>
                          <th className="py-1 px-2 border-r border-emerald-800">ফি বিবরণী</th>
                          <th className="py-1 px-2 text-right">পরিমাণ (টাকা)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-1 px-2">আবেদন ও কোর্ট ফি</td>
                          <td className="py-1 px-2 text-right font-mono font-bold">২০.০০</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2">নোটিশ জারি ফি</td>
                          <td className="py-1 px-2 text-right font-mono font-bold">৫০.০০</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-2">রেকর্ড সংশোধন ও ডিসিআর ফি</td>
                          <td className="py-1 px-2 text-right font-mono font-bold">১,১০০.০০</td>
                        </tr>
                        <tr className="bg-emerald-50 font-bold text-emerald-900">
                          <td className="py-1.5 px-2">সর্বমোট সরকারি আদায়কৃত ফি</td>
                          <td className="py-1.5 px-2 text-right font-mono">১,১৭০.০০</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs font-sans">
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 block">বিএস খতিয়ান নং:</span>
                        <span className="font-bold font-mono text-[#006A4E] text-sm">৭৮৬</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">দাগ নম্বর:</span>
                        <span className="font-bold font-mono text-slate-900 text-sm">১০১</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">মৌজা ও জে.এল.:</span>
                        <span className="font-bold text-slate-900">বীরুলিয়া (৮৯)</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                      <div className="text-[11px] font-bold text-emerald-950 mb-1">
                        হস্তান্তরিত মালিকানার হিস্যা ও পরিমাণ:
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>মালিক: মো: রহিম উদ্দিন সরকার</span>
                        <span className="font-mono text-[#006A4E]">জমির পরিমাণ: ১৫.০০ শতক</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Section */}
                <div className="pt-4 border-t border-slate-200 space-y-2 font-sans">
                  {/* Tamper Warning */}
                  {config.show_tamper_warning_text && (
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[9px] text-amber-900 leading-tight">
                      <span className="font-bold">সতর্কবার্তা: </span>
                      {config.tamper_warning_text_bn}
                    </div>
                  )}

                  {/* Cryptographic Hash */}
                  {config.show_cryptographic_hash && (
                    <div className="text-[9px] font-mono text-slate-500 break-all bg-slate-100 p-1.5 rounded-md">
                      <span className="font-bold text-slate-700">SHA-256 HASH: </span>
                      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                    </div>
                  )}

                  {/* Bottom Footer Authority Seal */}
                  <div className="flex items-end justify-between pt-2">
                    <div className="text-[9px] text-slate-500">
                      ইস্যুর তারিখ: {new Date().toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US')}
                    </div>
                    {config.show_issuing_authority_signature && (
                      <div className="text-center">
                        <div className="w-20 h-6 border-b border-dashed border-slate-400 mx-auto flex items-center justify-center text-[8px] font-mono text-emerald-800 font-bold">
                          AC_LAND_SEAL
                        </div>
                        <div className="text-[9px] font-bold text-slate-800">সহকারী কমিশনার (ভূমি)</div>
                        <div className="text-[8px] text-slate-500">সাভার, ঢাকা</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-[11px] text-slate-400">
              {t(
                'এই প্রিভিউটি কনফিগারেশন পরিবর্তনের সাথে সাথে তাৎক্ষণিকভাবে রেন্ডার হয়।',
                'This preview updates in realtime as you tweak watermark and layout controls.'
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
