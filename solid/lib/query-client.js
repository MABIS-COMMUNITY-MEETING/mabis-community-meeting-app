import { QueryClient, MutationCache } from "@tanstack/solid-query";
import { detectLowPowerDevice } from "@/lib/performance-tier";
import { toast } from "~/lib/toast";

/*
 * Port of src/lib/query-client.js.
 *
 * The cache policy is copied exactly rather than re-tuned, because it is
 * deliberate: this data moves on a weekly cadence, so it is served instantly
 * from cache and never refetched on mount, focus or reconnect. That policy is
 * a large part of why the app feels fast on a slow connection — most
 * navigations perform zero network work.
 *
 * The shorter cache lifetime on low-power devices is also kept: gcTime holds
 * deserialised objects in memory, and on a 2GB machine a 30-minute window is
 * memory pressure that turns into GC pauses, which is exactly the jank we are
 * trying to avoid.
 */
const CACHE_LIFETIME = detectLowPowerDevice() ? 10 * 60 * 1000 : 30 * 60 * 1000;

function shouldRetry(failureCount, error) {
  const status = error?.status || error?.response?.status;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  if (status && status < 500 && status !== 408 && status !== 429) return false;
  return failureCount < 1;
}

/**
 * Every failed write says so — same rationale as the React build: a rejected
 * save used to vanish silently, leaving a form looking unsaved with no
 * explanation. Handling it on the cache covers every mutation at once,
 * including ones added later, and runs in addition to any local onError.
 */
const mutationCache = new MutationCache({
  onError: (error) => {
    toast({
      variant: "destructive",
      title: "That did not save",
      description: error?.message
        ? String(error.message)
        : "Check your connection and try again. Your text is still here.",
    });
  },
});

export const queryClientInstance = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      gcTime: CACHE_LIFETIME,
      retry: shouldRetry,
    },
  },
});
