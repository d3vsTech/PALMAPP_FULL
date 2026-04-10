import { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ 
  variant = 'rectangular', 
  width, 
  height, 
  className, 
  style,
  ...props 
}: SkeletonProps) {
  const variants = {
    text: 'h-4 w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };
  
  return (
    <div
      className={cn('skeleton bg-muted', variants[variant], className)}
      style={{
        width: width,
        height: height,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton width="40%" height="1rem" />
          <Skeleton width="60%" height="2rem" />
          <Skeleton width="30%" height="0.875rem" />
        </div>
        <Skeleton variant="circular" width="3rem" height="3rem" />
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-4">
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="25%" height="1rem" />
        <Skeleton width="15%" height="1rem" />
        <Skeleton width="20%" height="1rem" />
        <Skeleton width="10%" height="1rem" />
      </div>
      {/* Rows */}
      {[...Array(5)].map((_, i) => (
        <div key={i} className="p-4 border-b border-border flex items-center gap-4">
          <Skeleton width="20%" height="0.875rem" />
          <Skeleton width="25%" height="0.875rem" />
          <Skeleton width="15%" height="0.875rem" />
          <Skeleton width="20%" height="0.875rem" />
          <Skeleton width="10%" height="0.875rem" />
        </div>
      ))}
    </div>
  );
}
