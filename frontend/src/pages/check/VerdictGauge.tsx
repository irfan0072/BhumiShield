import React from 'react';

const ZONES = [
  { from: 180, to: 120, color: '#006A4E' },
  { from: 120, to: 60, color: '#B7791F' },
  { from: 60, to: 0, color: '#C8102E' },
];

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [60 + r * Math.cos(a), 62 - r * Math.sin(a)];
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/**
 * Semicircle gauge with three zones (safe / check / risky).
 * `zone` 0..2 is the verdict; the active zone is solid, others faded, a needle points at it.
 */
export const VerdictGauge: React.FC<{ zone: 0 | 1 | 2; label: string; className?: string }> = ({ zone, label, className }) => {
  const needleDeg = 150 - zone * 60;
  const [nx, ny] = pt(needleDeg, 34);
  return (
    <svg viewBox="0 0 120 78" className={className} role="img" aria-label={label}>
      {ZONES.map((z, i) => (
        <path
          key={i}
          d={arc(z.from - (i === 0 ? 0 : 2), z.to + (i === 2 ? 0 : 2), 48)}
          fill="none"
          stroke={z.color}
          strokeOpacity={i === zone ? 1 : 0.18}
          strokeWidth="11"
          strokeLinecap="butt"
        />
      ))}
      <line x1="60" y1="62" x2={nx} y2={ny} stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="62" r="5" fill="#0F172A" />
      <text x="60" y="77" textAnchor="middle" fontSize="10" fontWeight="600" fill="#334155">
        {label}
      </text>
    </svg>
  );
};
