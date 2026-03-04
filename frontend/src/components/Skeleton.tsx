import type { ReactNode } from 'react';

interface SkeletonProps {
  className?: string;
  children?: ReactNode;
}

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-800/80 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
      {children}
    </div>
  );
}

