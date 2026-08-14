import { isConstrainedNetwork, saveDataEnabled } from "@/lib/performance-tier";
import { setLoadingState } from "@/lib/loading-state";

const HOME_WARMUP_BUDGET_MS = 2800;
const CONSTRAINED_WARMUP_BUDGET_MS = 900;
let homeRoutePromise;

function waitWithinBudget(promise, timeoutMs) {
  let timer;
  const budget = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  return Promise.race([promise, budget]).finally(() => clearTimeout(timer));
}

function loadHomeRoute() {
  if (homeRoutePromise) return homeRoutePromise;

  let reportedProgress = 8;
  let acceptingProgress = true;
  const report = ({ progress, detail }) => {
    if (!acceptingProgress) return;
    reportedProgress = Math.max(reportedProgress, progress);
    setLoadingState({
      progress: reportedProgress,
      label: "CACHING STUFF",
      detail,
    });
  };

  report({ progress: 8, detail: "HOME / SECTIONS 01–10" });

  homeRoutePromise = (async () => {
    const homeModulePromise = import("@/pages/Home");
    const warmupPromise = import("@/lib/home-route-warmup")
      .then(({ warmHomeRoute }) => warmHomeRoute(report))
      .catch(() => undefined);

    const homeModule = await homeModulePromise;
    report({ progress: 22, detail: "HOME SHELL READY" });

    await waitWithinBudget(
      warmupPromise,
      isConstrainedNetwork() ? CONSTRAINED_WARMUP_BUDGET_MS : HOME_WARMUP_BUDGET_MS,
    );

    acceptingProgress = false;
    setLoadingState({
      progress: 100,
      label: "CACHING STUFF",
      detail: "SECTIONS READY",
    });
    return homeModule;
  })();

  return homeRoutePromise;
}

const routeLoaders = {
  "/login": () => import("@/pages/Login"),
  "/home": loadHomeRoute,
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
  if (saveDataEnabled()) return;
  const loader = routeLoaders[pathname];
  if (!loader) return;
  void loader();
}

export const routeModules = routeLoaders;
