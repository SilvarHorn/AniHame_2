import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Monitor, Smartphone, X, ExternalLink, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { cn } from '../../lib/utils';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'drawer' | 'settings';
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'settings',
  onAction,
}) => {
  const { isInstallable, isInstalled, platform, isInIframe, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'android' | 'ios'>('windows');

  useEffect(() => {
    if (platform === 'android') setActiveTab('android');
    else if (platform === 'ios') setActiveTab('ios');
    else setActiveTab('windows');
  }, [platform]);

  useEffect(() => {
    if (!showGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuide(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuide]);

  // Suppress install UI when already running in standalone app mode
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    onAction?.();
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowGuide(true);
  };

  const buttonLabel = isInstallable ? 'Install App' : 'Get App';

  return (
    <>
      {variant === 'settings' ? (
        <div className="bg-gray-900/50 p-5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 flex items-center gap-2">
              <Download size={15} className="text-primary shrink-0" />
              Get App (Windows &amp; Android)
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Install AniHame as a standalone desktop window on Windows or full-screen app on Android
            </p>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
          >
            <Download size={14} className="shrink-0" />
            <span>{buttonLabel}</span>
          </button>
        </div>
      ) : variant === 'drawer' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 bg-primary/15 hover:bg-primary/25 text-primary px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-95 border border-primary/30 mb-2 cursor-pointer"
        >
          <Download size={15} />
          <span>{buttonLabel}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
          title="Install AniHame as a standalone Windows or Android app"
        >
          <Download size={13} className="shrink-0" />
          <span>{buttonLabel}</span>
        </button>
      )}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setShowGuide(false)}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 8 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl bg-[#10141d] border border-white/10 p-5 sm:p-6 shadow-2xl text-[#FBF3E5]"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#FBF3E5]">
                        Install AniHame App
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Run AniHame as a standalone window on Windows or full-screen app on Android.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGuide(false)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      aria-label="Close install guide"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {isInIframe && (
                    <div className="mb-4 rounded-xl bg-primary/10 border border-primary/25 p-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-200 leading-relaxed">
                        Open AniHame in its own browser tab first to enable one-click installation.
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-[#0B0C0F] text-xs font-bold hover:opacity-90 transition-opacity"
                      >
                        <ExternalLink size={13} />
                        <span>Open Tab</span>
                      </a>
                    </div>
                  )}

                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) setShowGuide(false);
                      }}
                      className="w-full mb-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-[#0B0C0F] font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <Download size={16} />
                      <span>Install Now</span>
                    </button>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 mb-4">
                    {(
                      [
                        { id: 'windows', label: 'Windows', icon: Monitor },
                        { id: 'android', label: 'Android', icon: Smartphone },
                        { id: 'ios', label: 'iOS', icon: Share },
                      ] as const
                    ).map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            'flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer',
                            active
                              ? 'bg-primary text-[#0B0C0F] shadow-sm'
                              : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                          )}
                        >
                          <Icon size={13} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {activeTab === 'windows' && (
                    <ol className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">1</span>
                        <span>Open AniHame in <strong>Microsoft Edge</strong> or <strong>Google Chrome</strong> on Windows.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">2</span>
                        <span>Click the <strong>Install App</strong> icon on the right side of the address bar (or Menu → <strong>Apps → Install AniHame</strong>).</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">3</span>
                        <span>AniHame will appear in your <strong>Start Menu</strong>, <strong>Taskbar</strong>, and Desktop as a standalone window.</span>
                      </li>
                    </ol>
                  )}

                  {activeTab === 'android' && (
                    <ol className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">1</span>
                        <span>Open AniHame in <strong>Google Chrome</strong> or <strong>Edge</strong> on your Android device.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">2</span>
                        <span>Tap the <strong>⋮ Menu</strong> button in the top-right corner and select <strong>Install app</strong> (or <strong>Add to Home screen → Install</strong>).</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">3</span>
                        <span>Launch AniHame from your Android app drawer in full-screen standalone mode without browser bars.</span>
                      </li>
                    </ol>
                  )}

                  {activeTab === 'ios' && (
                    <ol className="space-y-2.5 text-xs text-gray-300 leading-relaxed">
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">1</span>
                        <span>Open AniHame in <strong>Safari</strong> on your iPhone or iPad.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">2</span>
                        <span>Tap the <strong>Share</strong> button in the Safari toolbar.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-primary font-bold flex items-center justify-center shrink-0">3</span>
                        <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
                      </li>
                    </ol>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};
