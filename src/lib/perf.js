// Linux desktop detection — Linux GPU/driver stacks often struggle with
// full-viewport blend modes, animated noise, and scroll hijacking.
export const isLinux =
  typeof navigator !== "undefined" &&
  /linux/i.test(navigator.platform || navigator.userAgent) &&
  !/android/i.test(navigator.userAgent);