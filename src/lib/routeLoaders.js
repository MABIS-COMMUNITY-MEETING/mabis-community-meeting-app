const routeLoaders = {
  "/login": () => import("@/pages/Login"),
  "/register": () => import("@/pages/Register"),
  "/forgot-password": () => import("@/pages/ForgotPassword"),
  "/reset-password": () => import("@/pages/ResetPassword"),
  "/home": () => import("@/pages/Home"),
  "/history": () => import("@/pages/History"),
  "/history/announcements": () => import("@/pages/AnnouncementsHistory"),
  "/history/news": () => import("@/pages/NewsHistory"),
  "/feedback": () => import("@/pages/Feedback"),
};

export function loadRoute(pathname) {
  const loader = routeLoaders[pathname];
  return loader ? loader() : null;
}

export function preloadRoute(pathname) {
  if (navigator.connection?.saveData === true) return;
  const loader = routeLoaders[pathname];
  if (!loader) return;
  void loader();
}

export const routeModules = routeLoaders;
