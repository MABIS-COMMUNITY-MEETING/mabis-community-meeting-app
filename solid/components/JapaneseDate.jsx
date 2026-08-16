import { splitProps } from "solid-js";
import { JapaneseText } from "~/components/primitives";

const DEFAULT_OPTIONS = { year: "numeric", month: "short", day: "numeric" };

/**
 * Same idea as JapaneseText, but the `ja` companion is computed from a Date via
 * Intl instead of being hand-written. `children` should be the already
 * English-formatted date string.
 *
 * splitProps rather than destructuring: props are getters, and destructuring
 * would snapshot `date` once so the companion never updated.
 */
export default function JapaneseDate(props) {
  const [local, rest] = splitProps(props, ["date", "options", "as", "class", "japaneseClass", "layout", "children"]);

  const ja = () => {
    const parsed = local.date instanceof Date ? local.date : new Date(local.date);
    return Number.isNaN(parsed.getTime())
      ? ""
      : new Intl.DateTimeFormat("ja-JP", local.options || DEFAULT_OPTIONS).format(parsed);
  };

  return (
    <JapaneseText
      as={local.as || "span"}
      ja={ja()}
      class={local.class || ""}
      japaneseClass={local.japaneseClass || ""}
      layout={local.layout || "stacked"}
      {...rest}
    >
      {local.children}
    </JapaneseText>
  );
}
