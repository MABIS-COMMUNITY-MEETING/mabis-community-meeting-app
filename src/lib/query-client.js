import { QueryClient } from '@tanstack/react-query';
import { detectLowPowerDevice } from '@/lib/performance-tier';

const CACHE_LIFETIME = detectLowPowerDevice() ? 10 * 60 * 1000 : 30 * 60 * 1000;

function shouldRetry(failureCount, error) {
	const status = error?.status || error?.response?.status;
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
	if (status && status < 500 && status !== 408 && status !== 429) return false;
	return failureCount < 1;
}

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: false,
			// data is weekly-cadence: serve it instantly from cache and keep it
			// around across navigations instead of refetching on every mount
			staleTime: 5 * 60 * 1000,
			gcTime: CACHE_LIFETIME,
			retry: shouldRetry,
		},
	},
});