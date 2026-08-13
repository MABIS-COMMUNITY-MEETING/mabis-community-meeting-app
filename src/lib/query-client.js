import { QueryClient } from '@tanstack/react-query';
import { networkState } from '@/lib/network-policy';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			networkMode: 'offlineFirst',
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: true,
			// Most data changes on a weekly or deliberate-action cadence. Keeping
			// successful responses hot avoids re-downloading the same payload while
			// navigating or briefly losing connectivity.
			staleTime: 10 * 60 * 1000,
			gcTime: 2 * 60 * 60 * 1000,
			retry: (failureCount) => !networkState().constrained && failureCount < 1,
		},
	},
});