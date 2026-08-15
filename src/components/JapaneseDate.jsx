import JapaneseText from "@/components/JapaneseText";

const DEFAULT_OPTIONS = { year: "numeric", month: "short", day: "numeric" };

/**
 * Same idea as JapaneseText, but the `ja` companion is computed from a Date
 * via Intl instead of being hand-written. `children` should be the already
 * English-formatted date string.
 */
export default function JapaneseDate({
  date,
  options = DEFAULT_OPTIONS,
  as = "span",
  className = "",
  japaneseClassName = "",
  layout = "stacked",
  children,
  ...props
}) {
  const parsed = date instanceof Date ? date : new Date(date);
  const ja = isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("ja-JP", options).format(parsed);

  return (
    <JapaneseText
      as={as}
      ja={ja}
      className={className}
      japaneseClassName={japaneseClassName}
      layout={layout}
      {...props}
    >
      {children}
    </JapaneseText>
  );
}
