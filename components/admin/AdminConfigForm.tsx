"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { ArrowLeft, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import type { ConfigData } from "@/lib/server/admin-config";

interface AdminConfigFormProps {
  initialConfig: ConfigData;
}

export function AdminConfigForm({ initialConfig }: AdminConfigFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [config, setConfig] = useState<ConfigData>(initialConfig);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          max_attachment_mb: config.max_attachment_mb,
          auto_cancel_drafts_days: config.auto_cancel_drafts_days,
          restore_window_days: config.restore_window_days,
          audit_retention_days: config.audit_retention_days,
          default_priority_code: config.default_priority_code,
          allow_manager_self_approve: config.allow_manager_self_approve,
          require_approval_notes: config.require_approval_notes,
          max_mentions_per_comment: config.max_mentions_per_comment,
          mention_scope_default: config.mention_scope_default,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save config");
      }

      setSuccess("Configuration saved successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">System Configuration</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-4 p-3 bg-nx-success-bg border border-nx-success text-nx-success-text rounded">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-nx-danger-bg border border-nx-danger text-nx-danger-text rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Storage Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max_attachment_mb">
                Max Attachment Size (MB)
              </Label>
              <select
                id="max_attachment_mb"
                value={config.max_attachment_mb}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    max_attachment_mb: parseInt(e.target.value),
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="5">5 MB</option>
                <option value="10">10 MB</option>
                <option value="20">20 MB</option>
                <option value="50">50 MB</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                Maximum file size for request attachments
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lifecycle Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Request Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="auto_cancel_drafts_days">
                Auto-Cancel Draft Requests (Days)
              </Label>
              <select
                id="auto_cancel_drafts_days"
                value={config.auto_cancel_drafts_days}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    auto_cancel_drafts_days: parseInt(e.target.value),
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                Automatically cancel draft requests older than this period
              </p>
            </div>

            <div>
              <Label htmlFor="restore_window_days">Restore Window (Days)</Label>
              <select
                id="restore_window_days"
                value={config.restore_window_days}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    restore_window_days: parseInt(e.target.value),
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                Time window to restore soft-deleted requests
              </p>
            </div>

            <div>
              <Label htmlFor="audit_retention_days">
                Audit Log Retention (Days)
              </Label>
              <select
                id="audit_retention_days"
                value={config.audit_retention_days}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    audit_retention_days: parseInt(e.target.value),
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">1 year</option>
                <option value="2557">7 years (compliance)</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                How long to retain audit logs
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Default Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default_priority_code">Default Priority</Label>
              <select
                id="default_priority_code"
                value={config.default_priority_code}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    default_priority_code: e.target.value,
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="P1">P1 - Critical</option>
                <option value="P2">P2 - High</option>
                <option value="P3">P3 - Medium</option>
                <option value="P4">P4 - Low</option>
                <option value="P5">P5 - Very Low</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                Default priority for new requests
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Approval Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="require_approval_notes"
                checked={config.require_approval_notes}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    require_approval_notes: e.target.checked,
                  })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="require_approval_notes" className="font-normal">
                Require notes on approval/rejection
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Comment Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Comment & Mention Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="max_mentions_per_comment">
                Max @mentions per Comment
              </Label>
              <input
                type="number"
                id="max_mentions_per_comment"
                min="1"
                max="20"
                value={config.max_mentions_per_comment}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    max_mentions_per_comment: parseInt(e.target.value) || 5,
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              />
              <p className="text-xs text-nx-text-muted mt-1">
                Maximum number of users that can be @mentioned in one comment
              </p>
            </div>

            <div>
              <Label htmlFor="mention_scope_default">
                Default Mention Scope
              </Label>
              <select
                id="mention_scope_default"
                value={config.mention_scope_default}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mention_scope_default: e.target.value,
                  })
                }
                className="mt-2 w-full px-3 py-2 border border-nx-border-strong rounded-md"
              >
                <option value="requester_watchers">
                  Requester + Watchers Only
                </option>
                <option value="org_wide">Organization-Wide</option>
              </select>
              <p className="text-xs text-nx-text-muted mt-1">
                Who can be mentioned in comments
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
