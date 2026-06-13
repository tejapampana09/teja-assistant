import React from "react";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton rounded-2xl bg-white/[0.06] ${className}`}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-panel rounded-[2rem] p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function MemoryCardSkeleton() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="h-9 w-9 rounded-2xl shrink-0" />
      <Skeleton className="h-16 flex-1 rounded-3xl" />
    </div>
  );
}
