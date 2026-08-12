import "@/styles/glass.css";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import SoundEffects from '@/components/SoundEffects';
import CustomCursor from '@/components/CustomCursor';
import GlassRefraction from '@/components/GlassRefraction';
import GamepadNavigator from '@/components/GamepadNavigator';
import GrainOverlay from '@/components/GrainOverlay';
import SmoothScroll from '@/components/SmoothScroll';
import ScrollProgress from '@/components/ScrollProgress';
import PaletteStripe from '@/components/PaletteStripe';
import PrideAmbience from '@/components/PrideAmbience';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageTransition from '@/components/PageTransition';
import { lazy, Suspense } from 'react';
import Splash from '@/pages/Splash';
// Everything past the splash is code-split: the first paint no longer carries
// the editor, widgets or archive pages in its bundle.
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Home = lazy(() => import('@/pages/Home'));
const History = lazy(() => import('@/pages/History'));
const AnnouncementsHistory = lazy(() => import('@/pages/AnnouncementsHistory'));
const NewsHistory = lazy(() => import('@/pages/NewsHistory'));
const Feedback = lazy(() => import('@/pages/Feedback'));
import LoadingScreen from '@/components/LoadingScreen';
import MotionPreference from '@/components/MotionPreference';
import PrefsSync from '@/components/PrefsSync';

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Splash />} />
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
          <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
          <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
            <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/history" element={<PageTransition><History /></PageTransition>} />
            <Route path="/history/announcements" element={<PageTransition><AnnouncementsHistory /></PageTransition>} />
            <Route path="/history/news" element={<PageTransition><NewsHistory /></PageTransition>} />
            <Route path="/feedback" element={<PageTransition><Feedback /></PageTransition>} />
          </Route>
          <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <LoadingScreen />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return <AnimatedRoutes />;
};

function App() {
  return (
    <MotionPreference>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <PrefsSync />
            <SoundEffects />
            <SmoothScroll />
            <GrainOverlay />
            <PrideAmbience />
            <GlassRefraction />
            <CustomCursor />
            <PaletteStripe />
            <ScrollProgress />
            <GamepadNavigator />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </MotionPreference>
  );
}

export default App;