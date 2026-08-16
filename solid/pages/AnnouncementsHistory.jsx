import { base44 } from "@/api/base44Client";
import ArchivePage from "~/pages/ArchivePage";

export default function AnnouncementsHistory() {
  return (
    <ArchivePage
      queryKey="announcements"
      fetch={() => base44.entities.Announcement.list("-created_date", 500)}
      navLabel=" N°03 — ANNOUNCEMENTS"
      archiveLabel=" ARCHIVE — 03"
      archiveJa="アーカイブ — 03"
      title={<>ANNOUNCE-<br />MENTS</>}
      titleClamp="text-[clamp(2.45rem,12vw,4.5rem)]"
      subtitleJa="お知らせ履歴"
      countJa="件の投稿"
      itemNoun="announcement"
      showPinned
      emptyText="No announcements yet"
      emptyJa="まだお知らせがありません"
      emptyHint="Posted announcements will be grouped here by week"
      emptyHintJa="投稿されたお知らせは週ごとにここにグループ化されます"
    />
  );
}
