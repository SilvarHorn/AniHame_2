import React, { useEffect, useState } from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState('#FBF3E5');
  const [bgGradient, setBgGradient] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [bgOpacity, setBgOpacity] = useState(100);
  
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('anime_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          let color = parsed.themeColor;
          if (!color || color === '#8AD7D0') {
            color = '#FBF3E5';
          }
          setThemeColor(color);
          document.documentElement.style.setProperty('--theme-color', color);
          document.documentElement.style.setProperty('--theme-color-hover', color);
          if (parsed.bgGradient !== undefined) {
            setBgGradient(parsed.bgGradient);
          }
          if (parsed.bgImage !== undefined) {
            setBgImage(parsed.bgImage);
          }
          if (parsed.bgOpacity !== undefined) {
            setBgOpacity(parsed.bgOpacity);
          }
        } else {
          document.documentElement.style.setProperty('--theme-color', '#FBF3E5');
          document.documentElement.style.setProperty('--theme-color-hover', '#e8dfcf');
        }
      } catch (e) {}
    };
    
    // Initial load
    handleStorageChange();
    
    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    // Custom event for local changes in the same window
    window.addEventListener('profile-updated', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profile-updated', handleStorageChange);
    };
  }, []);

  return (
    <div 
      className="min-h-screen text-[#FBF3E5] font-sans selection:bg-primary/30 bg-fixed relative overflow-hidden bg-[#0B0C0F]"
      style={
        !bgImage && bgGradient?.includes('gradient')
          ? { backgroundImage: bgGradient }
          : !bgImage 
            ? { backgroundColor: bgGradient || '#0B0C0F' }
            : {}
      }
    >
      {bgImage && (
        <>
          <div 
            className="fixed inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ 
              backgroundImage: `url(${bgImage})`,
              opacity: bgOpacity / 100 
            }}
          />
          {/* Fallback solid background behind the image so it blends if opacity < 100 */}
          <div className="fixed inset-0 z-[-1] bg-[#0B0C0F] pointer-events-none" />
        </>
      )}

      {/* Repeating Pattern for empty margins on ultra-wide screens */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none hidden xl:block opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(var(--theme-color) 2px, transparent 2px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(to right, black 0%, black calc(50% - 44rem), transparent calc(50% - 40rem), transparent calc(50% + 40rem), black calc(50% + 44rem), black 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 0%, black calc(50% - 44rem), transparent calc(50% - 40rem), transparent calc(50% + 40rem), black calc(50% + 44rem), black 100%)'
        }}
      />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="pt-14 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
