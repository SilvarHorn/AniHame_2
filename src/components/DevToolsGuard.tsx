import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import devtoolsDetector from 'devtools-detector';

export default function DevToolsGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDevToolsOpenRef = useRef(false);

  useEffect(() => {
    const redirectToHome = () => {
      if (window.location.pathname !== '/' && window.location.pathname !== '') {
        navigate('/', { replace: true });
      }
    };

    // 1. Keyboard shortcuts detection (F12, Ctrl+Shift+I, Cmd+Opt+I, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isF12 = e.key === 'F12' || e.keyCode === 123;
      const isDevToolsCombo =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key);
      const isViewSource = (e.ctrlKey || e.metaKey) && ['U', 'u'].includes(e.key);

      if (isF12 || isDevToolsCombo || isViewSource) {
        redirectToHome();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    // 2. devtools-detector listener
    const onDevToolsChange = (isOpen: boolean) => {
      isDevToolsOpenRef.current = isOpen;
      if (isOpen) {
        redirectToHome();
      }
    };

    try {
      devtoolsDetector.addListener(onDevToolsChange);
      devtoolsDetector.setDetectDelay(300);
      devtoolsDetector.launch();
    } catch (err) {
      console.warn('DevTools detector failed to launch:', err);
    }

    // 3. Fallback monitoring loop
    const intervalId = setInterval(() => {
      let detected = isDevToolsOpenRef.current || devtoolsDetector.isOpen;

      // Check docked DevTools when running in top-level window
      if (!detected && window.self === window.top) {
        const threshold = 160;
        const widthDiff = window.outerWidth - window.innerWidth > threshold;
        const heightDiff = window.outerHeight - window.innerHeight > threshold;
        if (widthDiff || heightDiff) {
          detected = true;
          isDevToolsOpenRef.current = true;
        }
      }

      if (detected) {
        redirectToHome();
      }
    }, 400);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      try {
        devtoolsDetector.removeListener(onDevToolsChange);
        devtoolsDetector.stop();
      } catch {}
      clearInterval(intervalId);
    };
  }, [navigate]);

  // When location changes, if DevTools is detected as open, redirect back to home
  useEffect(() => {
    const isDetected = isDevToolsOpenRef.current || devtoolsDetector.isOpen;
    if (isDetected && location.pathname !== '/' && location.pathname !== '') {
      navigate('/', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
