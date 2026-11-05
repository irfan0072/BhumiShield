import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-[#006A4E] focus:ring-offset-2 select-none border',
  {
    variants: {
      variant: {
        default:
          'border-[#006A4E]/20 bg-[#EDF7F4] text-[#006A4E]',
        brand:
          'border-transparent bg-[#006A4E] text-white shadow-sm',
        safe:
          'border-emerald-300 bg-emerald-50 text-emerald-800',
        success:
          'border-emerald-300 bg-emerald-50 text-emerald-800',
        warn:
          'border-amber-300 bg-amber-50 text-amber-900',
        warning:
          'border-amber-300 bg-amber-50 text-amber-900',
        danger:
          'border-rose-300 bg-rose-50 text-rose-800',
        outline:
          'border-[#006A4E]/30 text-[#006A4E] bg-white',
        secondary:
          'border-stone-200 bg-stone-100 text-stone-700',
      },
      size: {
        default: 'text-xs px-3 py-1',
        sm: 'text-[11px] px-2 py-0.5',
        lg: 'text-sm px-3.5 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
