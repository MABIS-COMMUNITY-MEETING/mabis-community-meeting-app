const INITIAL_LOADING_STATE = Object.freeze({
  progress: 6,
  label: "LOADING SHADERS",
  detail: "INITIALISING SESSION",
});

let loadingState = INITIAL_LOADING_STATE;
const listeners = new Set();

export function getLoadingState() {
  return loadingState;
}

export function getServerLoadingState() {
  return INITIAL_LOADING_STATE;
}

export function subscribeToLoadingState(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLoadingState(nextState) {
  const next = { ...loadingState, ...nextState };
  if (
    next.progress === loadingState.progress &&
    next.label === loadingState.label &&
    next.detail === loadingState.detail
  ) return;

  loadingState = next;
  listeners.forEach((listener) => listener());
}
