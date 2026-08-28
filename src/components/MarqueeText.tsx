import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface MarqueeTextProps {
  text: string;
  className?: string;
  align?: 'center' | 'left';
  hoverOnly?: boolean;
  isHovered?: boolean;
}

export function MarqueeText({ text, className, align = 'center', hoverOnly = false, isHovered }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (isHovered) {
      setAnimationKey(prev => prev + 1);
      const timer = setTimeout(() => {
        setShouldAnimate(true);
      }, 1000);
      return () => {
        clearTimeout(timer);
        setShouldAnimate(false);
      };
    } else {
      setShouldAnimate(false);
    }
  }, [isHovered]);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const textWidth = textRef.current.getBoundingClientRect().width;
        setIsOverflowing(textWidth > containerWidth);
      }
    };
    
    checkOverflow();
    const timeout = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden flex relative", className)}>
      {/* Invisible measuring span always in the DOM */}
      <span 
        ref={textRef} 
        className="absolute whitespace-nowrap opacity-0 pointer-events-none -z-10"
        aria-hidden="true"
      >
        {text}
      </span>

      {hoverOnly && isOverflowing ? (
        <div className="w-full relative">
          <div className="w-full truncate group-hover:opacity-0 transition-opacity duration-300 block text-left">
            {text}
          </div>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex overflow-hidden">
            <div key={animationKey} className={`whitespace-nowrap flex items-center animate-marquee ${shouldAnimate ? '[animation-play-state:running]' : '[animation-play-state:paused]'}`} style={{ width: 'max-content' }}>
              <span className="pr-8">{text}</span>
              <span className="pr-8">{text}</span>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className={cn(
            "whitespace-nowrap flex items-center",
            isOverflowing ? "animate-marquee" : (align === 'left' ? "w-full justify-start" : "w-full justify-center")
          )}
          style={isOverflowing ? { width: 'max-content' } : {}}
        >
          <span className={isOverflowing ? "pr-8" : ""}>{text}</span>
          {isOverflowing && <span className="pr-8">{text}</span>}
        </div>
      )}
    </div>
  );
}
