// Imported from query-core rather than react-query: dehydrate/hydrate are
// framework-agnostic and live in the core package, which both the React and
// Solid wrappers re-export. Sourcing them here keeps this module usable by
// both builds during the Solid migration without forking it.
import { dehydrate, hydrate } from "@tanstack/query-core";

const DB_NAME = "mabis-offline-cache";
const DB_VERSION = 1;
const STORE_NAME = "snapshots";
const SESSION_KEY = "mabis-offline-user-v1";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;

const PERSISTED_QUERY_ROOTS = new Set([
  "announcements",
  "app_settings",
  "assignments",
  "attendance",
  "birthdays",
  "calendarevents",
  "jobs",
  "lunchmenu",
  "meetings",
  "members",
  "missing-items",
  "news",
  "topics",
]);

let databasePromise;

function openDatabase() {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB unavailable"));
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function readRecord(key) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writeRecord(record) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

function tokenMarker(token) {
  if (!token) return "";
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function snapshotUser(user) {
  const fields = [
    "id",
    "email",
    "full_name",
    "role",
    "role_override",
    "avatar_url",
    "avatar_color",
    "avatar_history",
    "ui_prefs",
  ];
  return Object.fromEntries(fields.filter((field) => field in user).map((field) => [field, user[field]]));
}

export function saveOfflineUser(user, token) {
  const marker = tokenMarker(token);
  if (!user?.id || !marker) return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      marker,
      savedAt: Date.now(),
      user: snapshotUser(user),
    }));
  } catch {
    // Private browsing or storage policy can disable durable storage.
  }
}

export function restoreOfflineUser(token) {
  const marker = tokenMarker(token);
  if (!marker) return null;
  try {
    const record = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (!record?.user?.id || record.marker !== marker) return null;
    if (Date.now() - record.savedAt > MAX_AGE) return null;
    return record.user;
  } catch {
    return null;
  }
}

function queryCanPersist(query) {
  return query.state.status === "success" && PERSISTED_QUERY_ROOTS.has(query.queryKey?.[0]);
}

export async function restoreOfflineQueries(queryClient, userId) {
  if (!userId) return false;
  try {
    const record = await readRecord(`queries:${userId}`);
    if (!record?.state || Date.now() - record.savedAt > MAX_AGE) return false;
    hydrate(queryClient, record.state);

    // Cached data paints immediately. Refresh after startup, or after the first
    // reconnect when the app booted offline, without blocking the useful paint.
    const refresh = () => {
      void queryClient.invalidateQueries({
        predicate: (query) => PERSISTED_QUERY_ROOTS.has(query.queryKey?.[0]),
      });
    };
    const scheduleRefresh = () => window.setTimeout(refresh, 1800);
    if (navigator.onLine !== false) scheduleRefresh();
    else window.addEventListener("online", scheduleRefresh, { once: true });
    return true;
  } catch {
    return false;
  }
}

export function startOfflineQueryPersistence(queryClient, userId) {
  if (!userId) return () => {};

  let timer = 0;
  let idleId = 0;
  let stopped = false;

  const persist = async () => {
    if (stopped) return;
    const state = dehydrate(queryClient, { shouldDehydrateQuery: queryCanPersist });
    const serialized = JSON.stringify(state);
    if (new Blob([serialized]).size > MAX_BYTES) return;
    try {
      await writeRecord({
        key: `queries:${userId}`,
        savedAt: Date.now(),
        state,
      });
    } catch {
      // Offline support is progressive; storage failures must not affect the app.
    }
  };

  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(() => void persist(), { timeout: 2500 });
      } else {
        void persist();
      }
    }, 1200);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event?.type === "updated" && event.query?.state.status === "success") schedule();
  });

  schedule();

  return () => {
    stopped = true;
    unsubscribe();
    window.clearTimeout(timer);
    if (idleId && "cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
  };
}

export async function clearOfflineData() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage policy errors.
  }

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // There may be no database yet.
  }
}
