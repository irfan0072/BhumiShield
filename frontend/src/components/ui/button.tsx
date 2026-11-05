import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006A4E] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#006A4E] text-white hover:bg-[#00553e] shadow-xs',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-xs',
        outline:
          'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-2xs',
        secondary:
          'bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-2xs',
        ghost:
          'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        link:
          'text-[#006A4E] underline-offset-4 hover:underline p-0 h-auto min-h-0',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 px-3 text-xs rounded-md',
        lg: 'h-12 px-6 text-base rounded-xl',
        icon: 'h-9 w-9 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
