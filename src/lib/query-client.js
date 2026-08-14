import { QueryClient, MutationCache } from '@tanstack/react-query';
import { detectLowPowerDevice } from '@/lib/performance-tier';
import { toast } from '@/components/ui/use-toast';

const CACHE_LIFETIME = detectLowPowerDevice() ? 10 * 60 * 1000 : 30 * 60 * 1000;

function shouldRetry(failureCount, error) {
	const status = error?.status || error?.response?.status;
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
	if (status && status < 500 && status !== 408 && status !== 429) return false;
	return failureCount < 1;
}

/**
 * Every failed write says so.
 *
 * Of the app's mutations, almost none carried an onError: a rejected save just
 * vanished, leaving the form sitting there looking unsaved with no explanation.
 * That is what made the discussion "it did not save at all" bug so hard to see.
 *
 * Handling it on the cache covers every mutation at once, including any added
 * later. A mutation that defines its own onError still gets to run it — this
 * fires as well, not instead, so local handling stays in charge of the detail.
 */
const mutationCache = new MutationCache({
	onError: (error) => {
		toast({
			variant: 'destructive',
			title: 'That did not save',
			description: error?.message
				? String(error.message)
				: 'Check your connection and try again. Your text is still here.',
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
			// data is weekly-cadence: serve it instantly from cache and keep it
			// around across navigations instead of refetching on every mount
			staleTime: 5 * 60 * 1000,
			gcTime: CACHE_LIFETIME,
			retry: shouldRetry,
		},
	},
});