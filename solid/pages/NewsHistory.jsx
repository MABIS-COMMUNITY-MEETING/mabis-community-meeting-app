import { base44 } from "@/api/base44Client";
import ArchivePage from "~/pages/ArchivePage";

export default function NewsHistory() {
  return (
    <ArchivePage
      queryKey="news"
      fetch={() => base44.entities.NewsItem.list("-created_date", 500)}
      navLabel=" N°04 — NEWS"
      archiveLabel=" ARCHIVE — 04"
      archiveJa="アーカイブ — 04"
      title={<>NEWS<br />HISTORY</>}
      subtitleJa="ニュース履歴"
      countJa="件の記事"
      itemNoun="article"
      emptyText="No news yet"
      emptyJa="まだニュースがありません"
      emptyHint="Published articles will be grouped here by week"
      emptyHintJa="公開された記事は週ごとにここにグループ化されます"
    />
  );
}
