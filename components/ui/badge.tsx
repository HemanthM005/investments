import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-indigo-600 text-white',
        success: 'border-transparent bg-emerald-900/60 text-emerald-400',
        destructive: 'border-transparent bg-red-900/60 text-red-400',
        warning: 'border-transparent bg-amber-900/60 text-amber-400',
        outline: 'border-[#2a2d3e] text-slate-400',
        secondary: 'border-transparent bg-[#2a2d3e] text-slate-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
