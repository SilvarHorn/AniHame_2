import React, { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Layout from './components/layout/Layout';

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const Trending = lazy(() => import('./pages/Trending'));
const AnimeDetails = lazy(() => import('./pages/AnimeDetails'));
const Watch = lazy(() => import('./pages/Watch'));
const Profile = lazy(() => import('./pages/Profile'));
const Schedule = lazy(() => import('./pages/Schedule'));
const ContinueWatching = lazy(() => import('./pages/ContinueWatching'));

function PageLoader() {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center gap-6"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity, 
          ease: 'easeInOut' 
        }}
        className="text-5xl tracking-wide text-primary"
        style={{ fontFamily: "'Dancing Script', cursive" }}
      >
        Ani<span className="text-white">Hame</span>
      </motion.div>
      <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden relative">
        <motion.div
          className="absolute top-0 left-0 h-full bg-primary rounded-full"
          initial={{ width: "0%", x: "-100%" }}
          animate={{ width: "50%", x: "250%" }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </motion.div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      {/* @ts-ignore: key is an intrinsic React prop */}
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Suspense fallback={<PageLoader />}><PageWrapper><Home /></PageWrapper></Suspense>} />
        <Route path="/explore" element={<Suspense fallback={<PageLoader />}><PageWrapper><Explore /></PageWrapper></Suspense>} />
        <Route path="/trending" element={<Suspense fallback={<PageLoader />}><PageWrapper><Trending /></PageWrapper></Suspense>} />
        <Route path="/anime/:id" element={<Suspense fallback={<PageLoader />}><PageWrapper><AnimeDetails /></PageWrapper></Suspense>} />
        <Route path="/watch/:id/:ep" element={<Suspense fallback={<PageLoader />}><PageWrapper><Watch /></PageWrapper></Suspense>} />
        <Route path="/profile" element={<Suspense fallback={<PageLoader />}><PageWrapper><Profile /></PageWrapper></Suspense>} />
        <Route path="/schedule" element={<Suspense fallback={<PageLoader />}><PageWrapper><Schedule /></PageWrapper></Suspense>} />
        <Route path="/continue-watching" element={<Suspense fallback={<PageLoader />}><PageWrapper><ContinueWatching /></PageWrapper></Suspense>} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Layout>
        <AnimatedRoutes />
      </Layout>
    </BrowserRouter>
    </AuthProvider>
  );
}
