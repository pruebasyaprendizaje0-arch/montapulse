
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={`relative overflow-hidden bg-slate-800/40 rounded-xl ${className}`}>
      <div className="absolute inset-0 glass-shimmer" />
    </div>
  );
};
