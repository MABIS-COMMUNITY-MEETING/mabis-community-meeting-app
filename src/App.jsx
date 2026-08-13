import "@/styles/glass.css";
import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { routeModules } from "@/lib/routeLoaders";
import GrainOverlay from "@/components/GrainOverlay";
import IdleMount from "@/components/IdleMount";
import LoadingScreen from "@/components/LoadingScreen";
import MotionPreference from "@/components/MotionPreference";
import OptionalCustomCursor from "@/components/OptionalCustomCursor";
import OptionalPrideAmbience from "@/components/OptionalPrideAmbience";
import PageTransition from "@/components/PageTransition";
import PaletteStripe from "@/components/PaletteStripe";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollToTop from "@/components/ScrollToTop";
import SmoothScroll from "@/components/SmoothScroll";
import SoundEffects from "@/components/SoundEffects";

const Splash = lazy(routeModules["/"]);
const Login = lazy(routeModules["/login"]);
const Register = lazy(routeModules["/register"]);
const ForgotPassword = lazy(routeModules["/forgot-password"]);
const ResetPassword = lazy(routeModules["/reset-password"]);
const PageNotFound = lazy(() => import("@/lib/PageNotFound"));
const ProtectedApplication = lazy(() => import("@/components/ProtectedApplication"));
const Toaster = lazy(() => import("@/components/ui/toaster").then((module) => ({ default: module.Toaster })));

function PublicRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/home" element={<ProtectedApplication />} />
        <Route path="/history" element={<ProtectedApplication />} />
        <Route path="/history/announcements" element={<ProtectedApplication />} />
        <Route path="/history/news" element={<ProtectedApplication />} />
        <Route path="/feedback" element={<ProtectedApplication />} />
        <Route path="*" element={<PageTransition><PageNotFound /></PageTransition>} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <MotionPreference>
      <Router>
        <ScrollToTop />
        <SoundEffects />
        <SmoothScroll />
        <GrainOverlay />
        <OptionalPrideAmbience />
        <OptionalCustomCursor />
        <PaletteStripe />
        <ScrollProgress />
        <PublicRoutes />
      </Router>
      <IdleMount timeout={1600} constrainedTimeout={8000}>
        <Suspense fallback={null}><Toaster /></Suspense>
      </IdleMount>
    </MotionPreference>
  );
}
