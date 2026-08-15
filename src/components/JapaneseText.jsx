import React from "react";
import { useJapaneseText } from "@/lib/japanese-text-preference";

export default function JapaneseText({
  children,
  ja,
  as: Tag = "span",
  className = "",
  japaneseClassName = "",
  layout = "stacked",
  ...props
}) {
  const enabled = useJapaneseText();
  const japaneseLayout = layout === "inline"
    ? "ml-1.5 inline"
    : "mt-0.5 block";

  return (
    <Tag className={className} {...props}>
      <span data-ja-skip>{children}</span>
      {enabled && ja && (
        <span
          lang="ja"
          className={`${japaneseLayout} ${japaneseClassName || "text-[0.72em] font-normal tracking-normal opacity-65"}`}
        >
          {ja}
        </span>
      )}
    </Tag>
  );
}
