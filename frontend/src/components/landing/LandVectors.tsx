import React from 'react';

/**
 * Topographic Contour & Cadastral Grid Vector Background
 * High-precision vector lines creating an authentic land survey aesthetic.
 */
export const TopographicContourVector: React.FC<{
  className?: string;
  opacity?: number;
  strokeColor?: string;
}> = ({ className = '', opacity = 0.18, strokeColor = 'rgba(52, 211, 153, 0.45)' }) => {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      viewBox="0 0 1440 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity }}
    >
      <defs>
        <pattern id="cadastral-grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M 60 0 L 0 0 0 60" fill="none" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="3 3" />
          <circle cx="0" cy="0" r="1.5" fill={strokeColor} />
          <path d="M -3 0 L 3 0 M 0 -3 L 0 3" stroke={strokeColor} strokeWidth="0.75" />
        </pattern>
        <linearGradient id="contour-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      {/* Grid Pattern */}
      <rect width="100%" height="100%" fill="url(#cadastral-grid)" />

      {/* Topographic Contour Elevation Waves */}
      <path
        d="M-50,220 C180,180 320,310 520,240 C720,170 860,260 1100,200 C1280,150 1400,240 1550,190"
        fill="none"
        stroke="url(#contour-grad)"
        strokeWidth="1.5"
      />
      <path
        d="M-50,270 C160,230 350,360 560,280 C760,210 900,310 1140,240 C1320,190 1420,280 1550,230"
        fill="none"
        stroke="url(#contour-grad)"
        strokeWidth="1.2"
        strokeDasharray="6 4"
      />
      <path
        d="M-50,330 C190,290 380,410 600,330 C800,250 940,360 1180,290 C1360,230 1440,320 1550,280"
        fill="none"
        stroke="url(#contour-grad)"
        strokeWidth="1.5"
      />
      <path
        d="M-50,390 C220,340 410,460 640,370 C840,290 980,400 1220,330 C1400,270 1460,370 1550,320"
        fill="none"
        stroke="url(#contour-grad)"
        strokeWidth="1"
      />
      <path
        d="M-50,450 C250,400 440,510 680,420 C880,340 1020,450 1260,380 C1430,320 1480,410 1550,370"
        fill="none"
        stroke="url(#contour-grad)"
        strokeWidth="1.2"
        strokeDasharray="4 6"
      />

      {/* Cadastral Boundary Line vectors (simulating mouza plots) */}
      <polygon
        points="120,80 280,60 320,170 160,200"
        fill="rgba(16, 185, 129, 0.05)"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeDasharray="4 2"
      />
      <polygon
        points="280,60 460,40 490,150 320,170"
        fill="rgba(52, 211, 153, 0.04)"
        stroke={strokeColor}
        strokeWidth="1"
      />
      <polygon
        points="1050,70 1240,40 1280,160 1090,190"
        fill="rgba(16, 185, 129, 0.05)"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeDasharray="4 2"
      />
      <polygon
        points="1240,40 1420,20 1450,140 1280,160"
        fill="rgba(52, 211, 153, 0.04)"
        stroke={strokeColor}
        strokeWidth="1"
      />

      {/* Coordinate & Survey Datum Badges */}
      <g opacity="0.65" fontSize="10" fontFamily="monospace" fill="#A7F3D0">
        <text x="30" y="55">DATUM: BTM / WGS84</text>
        <text x="30" y="70">LAT: 23°46&apos;22&quot;N  LON: 90°23&apos;45&quot;E</text>
        <text x="1260" y="55">CADASTRE: SHEET NO. 04</text>
        <text x="1260" y="70">SCALE: 1:3960 (16&quot; = 1 MILE)</text>
      </g>

      {/* North Arrow Rose in Top Right */}
      <g transform="translate(1380, 110) scale(0.65)" opacity="0.55">
        <circle cx="0" cy="0" r="28" fill="none" stroke="#6EE7B7" strokeWidth="1" strokeDasharray="3 3" />
        <path d="M 0 -36 L 8 0 L 0 -6 L -8 0 Z" fill="#34D399" />
        <path d="M 0 36 L 6 0 L 0 6 L -6 0 Z" fill="#065F46" />
        <text x="-4" y="-42" fill="#A7F3D0" fontSize="14" fontWeight="bold">N</text>
      </g>
    </svg>
  );
};

/**
 * Interactive Cadastral Mouza Map Vector Widget
 * Real interactive SVG representation of land plots with live selection, boundary lines,
 * surveyor stones, road corridors, and status badges.
 */
export interface CadastralPlotData {
  id: number;
  dagNo: string;
  dagNoBn: string;
  mouza: string;
  mouzaBn: string;
  jlNo: string;
  areaDecimal: string;
  khatianType: string;
  ownerName: string;
  status: 'VERIFIED' | 'SALE_LOCKED' | 'BANK_LIEN' | 'HELD_DISPUTE' | 'GOV_KHAS';
  points: string;
  center: [number, number];
}

export const CADASTRAL_PLOTS: CadastralPlotData[] = [
  {
    id: 101,
    dagNo: '101',
    dagNoBn: '১০১',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '12.50',
    khatianType: 'BS Khatian #402',
    ownerName: 'মো. রফিকুল ইসলাম',
    status: 'VERIFIED',
    points: '60,65 190,50 215,160 85,185',
    center: [135, 115]
  },
  {
    id: 102,
    dagNo: '102',
    dagNoBn: '১০২',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '15.20',
    khatianType: 'BS Khatian #403',
    ownerName: 'শামসুন্নাহার বেগম',
    status: 'BANK_LIEN',
    points: '190,50 340,40 365,150 215,160',
    center: [275, 100]
  },
  {
    id: 103,
    dagNo: '103',
    dagNoBn: '১০৩',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '9.80',
    khatianType: 'BS Khatian #408',
    ownerName: 'তারেক মাহমুদ (প্রবাসী)',
    status: 'SALE_LOCKED',
    points: '85,185 215,160 240,270 100,290',
    center: [160, 225]
  },
  {
    id: 104,
    dagNo: '104',
    dagNoBn: '১০৪',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '18.40',
    khatianType: 'BS Khatian #415',
    ownerName: 'আনিসুল হক গং',
    status: 'VERIFIED',
    points: '215,160 365,150 395,260 240,270',
    center: [305, 210]
  },
  {
    id: 105,
    dagNo: '105',
    dagNoBn: '১০৫',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '24.00',
    khatianType: 'BS Khatian #1 (খাস)',
    ownerName: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার',
    status: 'GOV_KHAS',
    points: '100,290 240,270 260,375 115,390',
    center: [180, 330]
  },
  {
    id: 106,
    dagNo: '106',
    dagNoBn: '১০৬',
    mouza: 'Dhanmondi',
    mouzaBn: 'ধানমন্ডি',
    jlNo: '78',
    areaDecimal: '8.75',
    khatianType: 'BS Khatian #421',
    ownerName: 'কামাল উদ্দিন ও ওয়ারিশগণ',
    status: 'HELD_DISPUTE',
    points: '240,270 395,260 420,365 260,375',
    center: [330, 315]
  }
];

export const CadastralMouzaMapWidget: React.FC<{
  selectedPlot: CadastralPlotData;
  onSelectPlot: (plot: CadastralPlotData) => void;
  lang: 'bn' | 'en';
  onNavigate?: (tab: string) => void;
}> = ({ selectedPlot, onSelectPlot, lang, onNavigate }) => {
  const getStatusMeta = (status: CadastralPlotData['status']) => {
    switch (status) {
      case 'VERIFIED':
        return {
          fill: '#059669',
          fillOpacity: 0.16,
          stroke: '#10B981',
          labelBn: 'বায়নাযোগ্য ও অক্ষত',
          labelEn: 'Verified & Transferable',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'SALE_LOCKED':
        return {
          fill: '#DC2626',
          fillOpacity: 0.2,
          stroke: '#EF4444',
          labelBn: 'নাগরিক বিক্রয় লক সক্রিয়',
          labelEn: 'Citizen Sale Lock Active',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
        };
      case 'BANK_LIEN':
        return {
          fill: '#D97706',
          fillOpacity: 0.2,
          stroke: '#F59E0B',
          labelBn: 'সোনালী ব্যাংক জামানত/লিয়েন',
          labelEn: 'Bank Lien (Sonali Bank)',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'HELD_DISPUTE':
        return {
          fill: '#7C3AED',
          fillOpacity: 0.2,
          stroke: '#8B5CF6',
          labelBn: 'বিরোধ ট্রাইব্যুনালে শুনানাধীন',
          labelEn: 'Tribunal Dispute Hearing',
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200'
        };
      case 'GOV_KHAS':
        return {
          fill: '#2563EB',
          fillOpacity: 0.16,
          stroke: '#3B82F6',
          labelBn: '১ নং খতিয়ান (সরকারি খাস জমি)',
          labelEn: 'Govt Khas Land (Sheet 1)',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200'
        };
    }
  };

  const currentMeta = getStatusMeta(selectedPlot.status);

  return (
    <div className="relative rounded-2xl border border-emerald-900/10 bg-gradient-to-b from-white to-[#f7faf8] shadow-lg p-5 md:p-6 overflow-hidden">
      {/* Decorative top coordinate header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-200/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800">
            {lang === 'bn' ? 'ডিজিটাল ক্যাডাস্ট্রাল মৌজা নকশা' : 'Digital Cadastral Mouza Map'}
          </span>
          <span className="text-slate-400">|</span>
          <span className="font-mono text-slate-600 font-semibold">
            {selectedPlot.mouzaBn} (জেএল: {selectedPlot.jlNo})
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>স্কেল: ১৬&quot; = ১ মাইল</span>
          <span className="hidden sm:inline">সিএস→এসএ→আরএস→বিএস ভেক্টর</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 items-center">
        {/* SVG Vector Map Canvas */}
        <div className="relative rounded-xl border border-slate-200/90 bg-[#f4f8f5] p-3 shadow-inner overflow-hidden">
          {/* Surveyor Compass and Grid watermark */}
          <div className="absolute top-4 right-4 pointer-events-none opacity-60">
            <svg width="48" height="48" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#065F46" strokeWidth="1" strokeDasharray="2 2" />
              <path d="M 24 6 L 29 24 L 24 20 L 19 24 Z" fill="#047857" />
              <path d="M 24 42 L 29 24 L 24 28 L 19 24 Z" fill="#9CA3AF" />
              <text x="21" y="5" fill="#065F46" fontSize="8" fontWeight="bold">N</text>
            </svg>
          </div>

          <svg
            viewBox="0 0 470 420"
            className="w-full h-auto select-none"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.04))' }}
          >
            <defs>
              {/* Pattern for road */}
              <pattern id="road-stripes" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#E2E8F0" strokeWidth="3" />
              </pattern>
            </defs>

            {/* Connecting Access Road Vector */}
            <path
              d="M 30,35 L 435,20 L 445,45 L 40,60 Z"
              fill="#E5E7EB"
              stroke="#CBD5E1"
              strokeWidth="1.5"
            />
            <text x="210" y="42" fill="#64748B" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
              {lang === 'bn' ? '১২ ফুট প্রশস্ত মৌজা সংযোগ সড়ক' : '12 ft Access Roadway'}
            </text>

            {/* Drainage / Waterbody Canal Vector */}
            <path
              d="M 20,400 Q 230,370 440,395 L 440,415 L 20,415 Z"
              fill="rgba(59, 130, 246, 0.15)"
              stroke="#93C5FD"
              strokeWidth="1.5"
            />
            <text x="220" y="410" fill="#3B82F6" fontSize="8" fontWeight="600" fontFamily="sans-serif">
              {lang === 'bn' ? 'সরকারি খাল ও প্রাকৃতিক নিষ্কাশন' : 'Public Drainage Canal'}
            </text>

            {/* Cadastral Parcel Polygons */}
            {CADASTRAL_PLOTS.map((plot) => {
              const isSelected = selectedPlot.id === plot.id;
              const meta = getStatusMeta(plot.status);

              return (
                <g
                  key={plot.id}
                  onClick={() => onSelectPlot(plot)}
                  className="cursor-pointer transition-all duration-200"
                  style={{ transformOrigin: `${plot.center[0]}px ${plot.center[1]}px` }}
                >
                  {/* Plot Polygon */}
                  <polygon
                    points={plot.points}
                    fill={isSelected ? meta.stroke : meta.fill}
                    fillOpacity={isSelected ? 0.35 : meta.fillOpacity}
                    stroke={isSelected ? '#006A4E' : meta.stroke}
                    strokeWidth={isSelected ? '3' : '1.8'}
                    strokeDasharray={plot.status === 'SALE_LOCKED' ? '6 3' : 'none'}
                    className="hover:opacity-90 transition-all"
                  />

                  {/* Surveyor Boundary Corner Stones (Pillars) */}
                  {isSelected &&
                    plot.points.split(' ').map((pt, pIdx) => {
                      const [cx, cy] = pt.split(',').map(Number);
                      return (
                        <circle
                          key={pIdx}
                          cx={cx}
                          cy={cy}
                          r="4"
                          fill="#006A4E"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                      );
                    })}

                  {/* Dag Number & Area Badge in Center */}
                  <rect
                    x={plot.center[0] - 32}
                    y={plot.center[1] - 16}
                    width="64"
                    height="28"
                    rx="6"
                    fill={isSelected ? '#006A4E' : '#FFFFFF'}
                    stroke={isSelected ? '#004D38' : '#CBD5E1'}
                    strokeWidth="1.2"
                    className="shadow-xs"
                  />
                  <text
                    x={plot.center[0]}
                    y={plot.center[1] - 3}
                    textAnchor="middle"
                    fill={isSelected ? '#FFFFFF' : '#0F172A'}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {lang === 'bn' ? `দাগ ${plot.dagNoBn}` : `Plot ${plot.dagNo}`}
                  </text>
                  <text
                    x={plot.center[0]}
                    y={plot.center[1] + 8}
                    textAnchor="middle"
                    fill={isSelected ? '#A7F3D0' : '#64748B'}
                    fontSize="8.5"
                    fontFamily="monospace"
                  >
                    {plot.areaDecimal} {lang === 'bn' ? 'শতক' : 'dec'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Map Legend Bar */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500" />
              <span>{lang === 'bn' ? 'অক্ষত' : 'Clean'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500/20 border border-rose-500" />
              <span>{lang === 'bn' ? 'বিক্রয় লক' : 'Locked'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500/20 border border-amber-500" />
              <span>{lang === 'bn' ? 'ব্যাংক বন্ধক' : 'Lien'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-purple-500/20 border border-purple-500" />
              <span>{lang === 'bn' ? 'বিরোধ শুনানী' : 'Dispute'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500/20 border border-blue-500" />
              <span>{lang === 'bn' ? 'খাস জমি' : 'Khas'}</span>
            </div>
          </div>
        </div>

        {/* Selected Plot Intelligence Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {selectedPlot.khatianType}
              </span>
              <h4 className="text-xl font-bold text-slate-900 mt-0.5">
                {lang === 'bn' ? `দাগ নম্বর: ${selectedPlot.dagNoBn}` : `Plot Dag: ${selectedPlot.dagNo}`}
              </h4>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${currentMeta.badgeClass}`}>
              {lang === 'bn' ? currentMeta.labelBn : currentMeta.labelEn}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'bn' ? 'জমির পরিমাণ' : 'Land Area'}</span>
              <span className="font-bold text-slate-800 text-sm font-mono">
                {selectedPlot.areaDecimal} {lang === 'bn' ? 'শতক' : 'decimals'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'bn' ? 'মৌজা ও জেএল' : 'Mouza & JL'}</span>
              <span className="font-bold text-slate-800 text-sm">
                {lang === 'bn' ? selectedPlot.mouzaBn : selectedPlot.mouza} · {selectedPlot.jlNo}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs space-y-1">
            <span className="text-emerald-800 text-[11px] font-bold block">
              {lang === 'bn' ? 'রেকর্ডকৃত মূল মালিক' : 'Recorded Owner Name'}:
            </span>
            <span className="font-semibold text-slate-800 text-sm block">
              {selectedPlot.ownerName}
            </span>
            <span className="text-slate-500 text-[11px] block">
              {lang === 'bn'
                ? 'সিএস ১৮৮৮ ➔ এসএ ১৯৫৬ ➔ আরএস ১৯৬২ ➔ বিএস বর্তমান চেইনে অখণ্ডতা নিশ্চিত'
                : 'CS 1888 ➔ SA 1956 ➔ RS 1962 ➔ BS unbroken lineage audit passed'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => onNavigate?.(`check?plot_id=${selectedPlot.id}`)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-[#006A4E] hover:bg-[#00553e] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <span>{lang === 'bn' ? 'এই দাগের খতিয়ান ও লিয়েন যাচাই' : 'Verify Full Khatian & Lien'}</span>
              <span>→</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('cadastral')}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>{lang === 'bn' ? 'ম্যাপে দেখুন' : 'GIS View'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Cadastral Gunter's Chain Vector Line
 * Represents the surveyor measuring chain connecting sequential workflow steps.
 */
export const SurveyorChainConnector: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`hidden md:flex items-center justify-center py-2 ${className}`}>
      <svg width="100%" height="24" viewBox="0 0 400 24" fill="none" className="overflow-visible">
        {/* Brass Chain Line */}
        <line x1="20" y1="12" x2="380" y2="12" stroke="#006A4E" strokeWidth="2" strokeDasharray="6 4" />
        {/* Brass Links */}
        <circle cx="20" cy="12" r="5" fill="#10B981" stroke="#065F46" strokeWidth="2" />
        <circle cx="110" cy="12" r="3.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="200" cy="12" r="5" fill="#10B981" stroke="#065F46" strokeWidth="2" />
        <circle cx="290" cy="12" r="3.5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
        <circle cx="380" cy="12" r="5" fill="#10B981" stroke="#065F46" strokeWidth="2" />
      </svg>
    </div>
  );
};

/**
 * Royal Ed25519 Cryptographic Wax Seal Vector
 * Represents official tamper-proof deed authentication.
 */
export const Ed25519WaxSealVector: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className = ''
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="sealGold" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="60%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </radialGradient>
        <radialGradient id="sealEmerald" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="65%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064E3B" />
        </radialGradient>
      </defs>

      {/* Outer 24-point serrated star seal edge */}
      <circle cx="50" cy="50" r="46" fill="url(#sealGold)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.15))" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#FDE68A" strokeWidth="1.5" strokeDasharray="3 2" />

      {/* Inner Emerald Ring */}
      <circle cx="50" cy="50" r="36" fill="url(#sealEmerald)" stroke="#FEF3C7" strokeWidth="1.5" />

      {/* Cryptographic Key & Shield Motif */}
      <path
        d="M 50,24 L 64,30 L 64,46 C 64,58 50,66 50,66 C 50,66 36,58 36,46 L 36,30 Z"
        fill="#FFFFFF"
        opacity="0.95"
      />
      {/* Central Keyhole */}
      <circle cx="50" cy="40" r="4" fill="#047857" />
      <polygon points="48,42 52,42 53,52 47,52" fill="#047857" />

      {/* Stars on Seal */}
      <polygon points="50,15 51,18 54,18 51.5,20 52.5,23 50,21 47.5,23 48.5,20 46,18 49,18" fill="#FDE68A" />
      <polygon points="20,50 21,53 24,53 21.5,55 22.5,58 20,56 17.5,58 18.5,55 16,53 19,53" fill="#FDE68A" />
      <polygon points="80,50 81,53 84,53 81.5,55 82.5,58 80,56 77.5,58 78.5,55 76,53 79,53" fill="#FDE68A" />

      {/* Bottom Ribbon */}
      <path d="M 30,76 L 50,71 L 70,76 L 66,85 L 50,81 L 34,85 Z" fill="#B45309" stroke="#FDE68A" strokeWidth="1" />
      <text x="50" y="79" textAnchor="middle" fill="#FEF3C7" fontSize="5.5" fontWeight="bold" fontFamily="monospace">
        SHA-256 ED25519
      </text>
    </svg>
  );
};

/**
 * Historical CS to BS Khatian Lineage Chain Vector
 */
export const KhatianLineageVector: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-between gap-1 w-full max-w-md mx-auto py-2 ${className}`}>
      {[
        { epoch: 'CS', year: '১৮৮৮', desc: 'ক্যাডাস্ট্রাল জরিপ' },
        { epoch: 'SA', year: '১৯৫৬', desc: 'জমিদারি অধিগ্রহণ' },
        { epoch: 'RS', year: '১৯৬২', desc: 'রিভিশনাল জরিপ' },
        { epoch: 'BS', year: 'বর্তমান', desc: 'বাংলাদেশ জরিপ' },
      ].map((item, idx, arr) => (
        <React.Fragment key={item.epoch}>
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-300 flex items-center justify-center font-bold text-xs text-[#006A4E] shadow-2xs font-mono">
              {item.epoch}
            </div>
            <span className="text-[10px] font-bold text-slate-800 mt-1">{item.year}</span>
            <span className="text-[9px] text-slate-400 hidden sm:inline">{item.desc}</span>
          </div>
          {idx < arr.length - 1 && (
            <div className="flex-1 flex items-center justify-center px-1">
              <div className="h-0.5 w-full bg-emerald-200 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border-t border-r border-emerald-500 rotate-45" />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Land Cadastral Pin Badge with Crosshair
 */
export const CadastralPinVector: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <circle cx="16" cy="16" r="14" fill="#ECFDF5" stroke="#10B981" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="6" fill="#006A4E" />
      <path d="M 16 2 L 16 8 M 16 24 L 16 30 M 2 16 L 8 16 M 24 16 L 30 16" stroke="#059669" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="2" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * Citizen Vault Lock Vector
 */
export const CitizenVaultLockVector: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="5" y="12" width="22" height="16" rx="4" fill="#047857" stroke="#10B981" strokeWidth="1.5" />
      <path d="M 10 12 L 10 8 C 10 4.68 12.68 2 16 2 C 19.32 2 22 4.68 22 8 L 22 12" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="19" r="2.5" fill="#FEF3C7" />
      <path d="M 16 21.5 L 16 24.5" stroke="#FEF3C7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Bank Lien NOC Certificate Vector
 */
export const BankLienNocVector: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = ''
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <rect x="4" y="3" width="24" height="26" rx="3" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.5" />
      <line x1="8" y1="8" x2="24" y2="8" stroke="#006A4E" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="13" x2="20" y2="13" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="18" x2="18" y2="18" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
      {/* Green Checkmark Stamp */}
      <circle cx="21" cy="22" r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M 18.5 22 L 20 23.5 L 23.5 20" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};
