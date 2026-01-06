"use client";

import { useRouter } from "next/navigation";

import { AlertCircle, CheckCircle2, Info, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { Announcement } from "@/lib/server/announcements";

interface AnnouncementListProps {
  announcements: Announcement[];
  isCEO: boolean;
}

export function AnnouncementList({
  announcements,
  isCEO,
}: AnnouncementListProps) {
  const router = useRouter();

  async function handleAcknowledge(announcementId: string) {
    try {
      const res = await fetch(
        `/api/announcements/${announcementId}/acknowledge`,
        {
          method: "POST",
        }
      );

      if (!res.ok) throw new Error("Failed to acknowledge");

      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error acknowledging announcement:", error);
      alert("Failed to acknowledge announcement");
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "urgent":
        return <AlertCircle className="h-5 w-5 text-nx-danger" />;
      case "important":
        return <AlertCircle className="h-5 w-5 text-nx-warning" />;
      default:
        return <Info className="h-5 w-5 text-nx-primary" />;
    }
  }

  function getTypeBadge(type: string) {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      urgent: "destructive",
      important: "default",
      info: "secondary",
    };
    return variants[type] || "secondary";
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const urgentOutstanding = announcements.filter(
    (a) => a.is_urgent_outstanding
  );
  const important = announcements.filter(
    (a) => a.announcement_type === "important" && !a.is_urgent_outstanding
  );
  const info = announcements.filter((a) => a.announcement_type === "info");

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">CEO Announcements</h1>
          <p className="text-muted-foreground">
            Official communications and directives from leadership
          </p>
        </div>
        {isCEO && (
          <Button onClick={() => router.push("/announcements/create")}>
            <Plus className="mr-2 h-4 w-4" />
            New Announcement
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Urgent Announcements (Outstanding) */}
        {urgentOutstanding.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-nx-danger flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Urgent - Action Required
            </h2>
            <div className="space-y-4">
              {urgentOutstanding.map((announcement) => (
                <Card key={announcement.id} className="border-nx-danger border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTypeIcon(announcement.announcement_type)}
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {announcement.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-3">
                            Published {formatDate(announcement.published_at)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={getTypeBadge(announcement.announcement_type)}
                      >
                        {announcement.announcement_type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap mb-4">
                      {announcement.content}
                    </p>
                    {announcement.require_acknowledgement &&
                      !announcement.is_acknowledged && (
                        <Button
                          onClick={async () =>
                            handleAcknowledge(announcement.id)
                          }
                          className="bg-nx-danger hover:bg-nx-danger-hover"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Acknowledge & Confirm
                        </Button>
                      )}
                    {announcement.is_acknowledged && (
                      <div className="flex items-center gap-2 text-nx-success text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Acknowledged
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Important Announcements */}
        {important.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-nx-warning" />
              Important
            </h2>
            <div className="space-y-4">
              {important.map((announcement) => (
                <Card key={announcement.id} className="border-nx-warning">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTypeIcon(announcement.announcement_type)}
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {announcement.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-3">
                            Published {formatDate(announcement.published_at)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={getTypeBadge(announcement.announcement_type)}
                      >
                        {announcement.announcement_type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap mb-4">
                      {announcement.content}
                    </p>
                    {announcement.require_acknowledgement &&
                      !announcement.is_acknowledged && (
                        <Button
                          variant="outline"
                          onClick={async () =>
                            handleAcknowledge(announcement.id)
                          }
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Acknowledge
                        </Button>
                      )}
                    {announcement.is_acknowledged && (
                      <div className="flex items-center gap-2 text-nx-success text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Acknowledged
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Info Announcements */}
        {info.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Info className="h-5 w-5 text-nx-primary" />
              Latest Updates
            </h2>
            <div className="space-y-4">
              {info.map((announcement) => (
                <Card key={announcement.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getTypeIcon(announcement.announcement_type)}
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {announcement.title}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground mb-3">
                            Published {formatDate(announcement.published_at)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={getTypeBadge(announcement.announcement_type)}
                      >
                        {announcement.announcement_type.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {announcements.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No announcements yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
