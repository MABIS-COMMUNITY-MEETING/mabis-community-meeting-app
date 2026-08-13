import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { routeModules } from "@/lib/routeLoaders";
import ProtectedRoute from "@/components/ProtectedRoute";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import LoadingScreen from "@/components/LoadingScreen";
import PageTransition from "@/components/PageTransition";
import PrefsSync from "@/components/PrefsSync";

const Home = lazy(routeModules["/home"]);
const History = lazy(routeModules["/history"]);
const AnnouncementsHistory = lazy(routeModules["/history/announcements"]);
const NewsHistory = lazy(routeModules["/history/news"]);
const Feedback = lazy(routeModules["/feedback"]);

function AuthenticatedRoutes() {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) return <LoadingScreen />;
  if (authError) {
    if (authError.type === "user_not_registered") return <UserNotRegisteredError />;
    if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
          <Route path="/home" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/history" element={<PageTransition><History /></PageTransition>} />
          <Route path="/history/announcements" element={<PageTransition><AnnouncementsHistory /></PageTransition>} />
          <Route path="/history/news" element={<PageTransition><NewsHistory /></PageTransition>} />
          <Route path="/feedback" element={<PageTransition><Feedback /></PageTransition>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function ProtectedApplication() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PrefsSync />
        <AuthenticatedRoutes />
      </QueryClientProvider>
    </AuthProvider>
  );
}
