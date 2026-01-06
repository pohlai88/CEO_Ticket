import { AnnouncementList } from "@/components/announcements/AnnouncementList";
import { getAnnouncements } from "@/lib/server/announcements";

export default async function AnnouncementsPage() {
  const { announcements, isCEO } = await getAnnouncements();

  return <AnnouncementList announcements={announcements} isCEO={isCEO} />;
}
