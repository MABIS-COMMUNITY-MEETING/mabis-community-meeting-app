/**
 * Infinite marquee band. Children are duplicated for a seamless loop.
 * `reverse` scrolls the other way; `speed` sets duration in seconds.
 */
export default function Marquee({ children, reverse = false, speed = 28, className = "" }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        className="flex w-max"
        style={{ animation: `marquee-x ${speed}s linear infinite${reverse ? " reverse" : ""}` }}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden>{children}</div>
      </div>
    </div>
  );
}