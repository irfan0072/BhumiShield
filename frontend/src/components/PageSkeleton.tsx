import React from 'react';
import { useAppUI } from '../i18n';

export const PageSkeleton: React.FC = () => {
  const { lang } = useAppUI();

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-pulse"
    >
      {/* Top Banner Skeleton */}
      <div className="h-28 sm:h-36 bg-gradient-to-r from-emerald-100/70 via-teal-50 to-emerald-100/50 rounded-3xl border border-emerald-200/50 flex flex-col justify-center px-6 space-y-3">
        <div className="h-4 w-32 bg-emerald-300/60 rounded-full" />
        <div className="h-7 w-64 sm:w-96 bg-emerald-400/50 rounded-xl" />
        <div className="h-3.5 w-48 bg-emerald-200/70 rounded-full" />
      </div>

      {/* Quick Filter & Search Bar Skeleton */}
      <div className="h-16 bg-white rounded-2xl border border-slate-200/80 p-3 flex items-center gap-3">
        <div className="h-10 w-28 bg-slate-100 rounded-xl" />
        <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
        <div className="h-10 w-24 bg-emerald-100/80 rounded-xl" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-slate-100" />
              <div className="w-16 h-5 rounded-full bg-slate-100" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-slate-200/80 rounded-lg" />
              <div className="h-3 w-full bg-slate-100 rounded-lg" />
              <div className="h-3 w-5/6 bg-slate-100 rounded-lg" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-3.5 w-20 bg-slate-100 rounded-full" />
              <div className="h-7 w-20 bg-emerald-100/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Accessible screen reader notice */}
      <span className="sr-only">
        {lang === 'bn' ? 'পৃষ্ঠার তথ্য প্রস্তুত হচ্ছে...' : 'Loading page content...'}
      </span>
    </div>
  );
};

export default PageSkeleton;
