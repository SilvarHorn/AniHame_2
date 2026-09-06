import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Film } from 'lucide-react';

interface AnimeCardSkeletonProps {
  key?: React.Key;
  orientation?: 'portrait' | 'landscape';
  index?: number;
}

export default function AnimeCardSkeleton({ orientation = 'portrait', index = 0 }: AnimeCardSkeletonProps) {
  const isLandscape = orientation === 'landscape';
  const { profile } = useAuth();

  const cardBorder = profile?.preferences?.cardBorder;
  const isCustomBorder = cardBorder?.mode === 'custom' && Boolean(cardBorder?.color);

  const borderStyle: React.CSSProperties = isCustomBorder ? {
    borderColor: cardBorder.color,
    borderWidth: `${Math.max(1, Math.min(10, cardBorder.width || 2))}px`,
    borderStyle: 'solid',
  } : {};

  // Stagger the shimmer wave smoothly across grid positions (0-11 loop)
  const staggerDelay = `${(index % 12) * 90}ms`;
  
  return (
    <div 
      style={borderStyle}
      className={`flex flex-col bg-[#0F1115] rounded-2xl overflow-hidden shadow-lg relative ${
        isCustomBorder ? '' : 'border border-white/5'
      }`}
    >
      <div className={`${isLandscape ? 'aspect-[16/9]' : 'aspect-[3/4]'} relative overflow-hidden bg-gradient-to-b from-[#181B23] via-[#13151D] to-[#0F1115]`}>
        {/* Subtle center watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] text-white">
          <Film size={28} />
        </div>

        {/* Rating badge placeholder pill */}
        <div className="absolute top-2 left-2 w-11 h-5 rounded-lg bg-white/[0.06] border border-white/5 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
            style={{ animationDelay: staggerDelay }}
          />
        </div>

        {/* Shimmer light sweep */}
        <div 
          className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none"
          style={{ animationDelay: staggerDelay }}
        />

        {/* Soft bottom gradient to blend with container */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-95 pointer-events-none" />
      </div>

      <div className="p-3 pt-2.5 pb-4 flex flex-col gap-2 z-10 relative bg-[#0F1115]">
        {/* Title skeleton with natural length variation */}
        <div 
          className="h-3.5 bg-white/[0.07] rounded-md relative overflow-hidden"
          style={{ width: `${65 + (index % 4) * 8}%` }}
        >
          <div 
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            style={{ animationDelay: `${(index % 12) * 90 + 70}ms` }}
          />
        </div>

        {/* Subtitle skeleton */}
        <div className="h-2.5 w-2/5 bg-white/[0.04] rounded-md relative overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            style={{ animationDelay: `${(index % 12) * 90 + 130}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
