import * as React from 'react';
import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-stone-200/80 dark:bg-stone-800/50',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
