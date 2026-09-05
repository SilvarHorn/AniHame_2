import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AnimeCardSkeletonProps {
  key?: React.Key;
  orientation?: 'portrait' | 'landscape';
}

export default function AnimeCardSkeleton({ orientation = 'portrait' }: AnimeCardSkeletonProps) {
  const isLandscape = orientation === 'landscape';
  const { profile } = useAuth();

  const cardBorder = profile?.preferences?.cardBorder;
  const isCustomBorder = cardBorder?.mode === 'custom' && Boolean(cardBorder?.color);

  const borderStyle: React.CSSProperties = isCustomBorder ? {
    borderColor: cardBorder.color,
    borderWidth: `${Math.max(1, Math.min(10, cardBorder.width || 2))}px`,
    borderStyle: 'solid',
  } : {};
  
  return (
    <div 
      style={borderStyle}
      className={`flex flex-col bg-[#0F1115] rounded-2xl overflow-hidden shadow-lg animate-pulse ${
        isCustomBorder ? '' : 'border border-white/5'
      }`}
    >
      <div className={`${isLandscape ? 'aspect-[16/9]' : 'aspect-[3/4]'} relative overflow-hidden bg-gray-800`}>
        {/* Soft bottom gradient mock */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0F1115] via-transparent to-transparent opacity-90" />
      </div>
      <div className="p-3 pt-2 pb-4 flex flex-col gap-2 z-10 relative bg-[#0F1115]">
        <div className="h-4 bg-gray-700/50 rounded w-full"></div>
        <div className="h-3 bg-gray-700/50 rounded w-1/2"></div>
      </div>
    </div>
  );
}
