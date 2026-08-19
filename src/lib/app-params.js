const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const toSnakeCase = (str) => {
	return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
	if (isNode) {
		return defaultValue;
	}
	const storageKey = `base44_${toSnakeCase(paramName)}`;
	const urlParams = new URLSearchParams(window.location.search);
	const searchParam = urlParams.get(paramName);
	if (removeFromUrl) {
		urlParams.delete(paramName);
		const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""
			}${window.location.hash}`;
		window.history.replaceState({}, document.title, newUrl);
	}
	if (searchParam) {
		storage.setItem(storageKey, searchParam);
		return searchParam;
	}
	if (defaultValue) {
		storage.setItem(storageKey, defaultValue);
		return defaultValue;
	}
	const storedValue = storage.getItem(storageKey);
	if (storedValue) {
		return storedValue;
	}
	return null;
}

/*
 * A URL parameter that is a COMMAND, not a setting.
 *
 * getAppParamValue() persists whatever it reads and falls back to the stored
 * copy on the next load. That is right for app_id or app_base_url, which
 * describe the app, and catastrophic for clear_access_token, which means "drop
 * the session I am carrying right now":
 *
 *   1. sign out — Base44 returns to the app with ?clear_access_token=true;
 *   2. the token is cleared, correctly, AND the flag is written to
 *      localStorage as base44_clear_access_token;
 *   3. sign back in — the new token is stored, fine;
 *   4. open the app again with a clean URL — the flag is still in storage, so
 *      the branch below fires and deletes the token that was just issued.
 *
 * From the first sign-out onwards the session could never survive a reload,
 * which is exactly the "it makes me log in every single time" report. Read it
 * from the URL only, strip it so a refresh cannot replay it, and never store
 * it.
 */
const getUrlOnlyParamValue = (paramName) => {
	if (isNode) return null;
	const urlParams = new URLSearchParams(window.location.search);
	const value = urlParams.get(paramName);
	if (value === null) return null;
	urlParams.delete(paramName);
	const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ""}${window.location.hash}`;
	window.history.replaceState({}, document.title, newUrl);
	return value;
}

const getAppParams = () => {
	if (getUrlOnlyParamValue("clear_access_token") === 'true') {
		storage.removeItem('base44_access_token');
		storage.removeItem('token');
	}
	/* Repair sessions already poisoned by the old behaviour. Without this, every
	   account that has signed out even once keeps being logged out on every
	   load, because the stale flag outlives the fix. */
	if (!isNode) storage.removeItem('base44_clear_access_token');
	return {
		appId: getAppParamValue("app_id", { defaultValue: import.meta.env.VITE_BASE44_APP_ID }),
		token: getAppParamValue("access_token", { removeFromUrl: true }),
		fromUrl: getAppParamValue("from_url", { defaultValue: window.location.href }),
		functionsVersion: getAppParamValue("functions_version", { defaultValue: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION }),
		appBaseUrl: getAppParamValue("app_base_url", { defaultValue: import.meta.env.VITE_BASE44_APP_BASE_URL }),
	}
}


export const appParams = {
	...getAppParams()
}
