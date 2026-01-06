"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface UrgentAnnouncement {
  id: string;
  title: string;
  content: string;
  published_at: string;
  require_acknowledgement: boolean;
}

export function UrgentAnnouncementBanner() {
  const router = useRouter();
  const [urgentAnnouncement, setUrgentAnnouncement] =
    useState<UrgentAnnouncement | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);

  useEffect(() => {
    void checkForUrgentAnnouncements();

    // Poll every 30 seconds for new urgent announcements
    const interval = setInterval(
      () => void checkForUrgentAnnouncements(),
      30000
    );
    return () => clearInterval(interval);
  }, []);

  async function checkForUrgentAnnouncements() {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) return;

      const data = await res.json();
      const announcements = data.announcements || [];

      // Find first urgent unacknowledged announcement
      const urgent = announcements.find(
        (a: any) => a.announcement_type === "urgent" && a.is_urgent_outstanding
      );

      setUrgentAnnouncement(urgent || null);
    } catch (error) {
      console.error("Error checking urgent announcements:", error);
    }
  }

  async function handleAcknowledge() {
    if (!urgentAnnouncement) return;

    setAcknowledging(true);
    try {
      const res = await fetch(
        `/api/announcements/${urgentAnnouncement.id}/acknowledge`,
        {
          method: "POST",
        }
      );

      if (!res.ok) throw new Error("Failed to acknowledge");

      // Clear the banner
      setUrgentAnnouncement(null);
    } catch (error) {
      console.error("Error acknowledging announcement:", error);
      alert("Failed to acknowledge announcement");
    } finally {
      setAcknowledging(false);
    }
  }

  function handleViewAll() {
    router.push("/announcements");
  }

  if (!urgentAnnouncement) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-nx-danger text-nx-text-inverse shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <AlertCircle className="h-6 w-6 mt-1 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              {urgentAnnouncement.title}
              <span className="text-xs bg-nx-danger px-2 py-1 rounded">
                URGENT
              </span>
            </h3>
            <p className="text-sm mb-3 line-clamp-2">
              {urgentAnnouncement.content}
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              {urgentAnnouncement.require_acknowledgement && (
                <Button
                  size="sm"
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="bg-nx-surface text-nx-danger hover:bg-nx-surface-well"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {acknowledging ? "Acknowledging..." : "Acknowledge & Dismiss"}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleViewAll}
                className="border-white text-nx-text-inverse hover:bg-nx-danger-hover"
              >
                View Full Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImportantAnnouncementBanner() {
  const router = useRouter();
  const [importantAnnouncements, setImportantAnnouncements] = useState<any[]>(
    []
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    void checkForImportantAnnouncements();
  }, []);

  async function checkForImportantAnnouncements() {
    try {
      const res = await fetch("/api/announcements");
      if (!res.ok) return;

      const data = await res.json();
      const announcements = data.announcements || [];

      // Find important announcements that aren't acknowledged
      const important = announcements.filter(
        (a: any) => a.announcement_type === "important" && !a.is_acknowledged
      );

      setImportantAnnouncements(important);
    } catch (error) {
      console.error("Error checking important announcements:", error);
    }
  }

  function handleDismiss(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  const visibleAnnouncements = importantAnnouncements.filter(
    (a) => !dismissed.has(a.id)
  );

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="bg-nx-warning-bg border-b-2 border-yellow-400">
      {visibleAnnouncements.map((announcement) => (
        <div key={announcement.id} className="container mx-auto px-4 py-3">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-nx-warning mt-0.5 flex-shrink-0" />

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm mb-1 text-yellow-900">
                {announcement.title}
              </h4>
              <p className="text-sm text-nx-warning-text line-clamp-1">
                {announcement.content}
              </p>
            </div>

            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/announcements")}
                className="text-xs"
              >
                View Details
              </Button>
              <button
                onClick={() => handleDismiss(announcement.id)}
                className="p-1 hover:bg-nx-warning-bg rounded"
              >
                <X className="h-4 w-4 text-nx-warning" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
