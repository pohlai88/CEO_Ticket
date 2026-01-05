'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';

type AnnouncementType = 'info' | 'important' | 'urgent';
type TargetScope = 'all' | 'team' | 'individuals';

export default function CreateAnnouncementPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    announcement_type: 'info' as AnnouncementType,
    target_scope: 'all' as TargetScope,
    require_acknowledgement: false,
    sticky_until: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        title: formData.title,
        content: formData.content,
        announcement_type: formData.announcement_type,
        target_scope: formData.target_scope,
        require_acknowledgement: formData.require_acknowledgement,
      };

      // Add sticky_until if provided
      if (formData.sticky_until) {
        payload.sticky_until = new Date(formData.sticky_until).toISOString();
      }

      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to publish announcement');
      }

      // Success - redirect to announcements list
      router.push('/announcements');
    } catch (error) {
      console.error('Error publishing announcement:', error);
      alert(error instanceof Error ? error.message : 'Failed to publish announcement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push('/announcements')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Announcements
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Create CEO Announcement</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Announcement title..."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                required
                value={formData.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className="mt-2"
                placeholder="Announcement content... (supports Markdown)"
              />
            </div>

            {/* Announcement Type */}
            <div>
              <Label>Type *</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="announcement_type"
                    value="info"
                    checked={formData.announcement_type === 'info'}
                    onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as AnnouncementType })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Info</div>
                    <div className="text-sm text-gray-500">Passive bulletin - appears in feed only</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="announcement_type"
                    value="important"
                    checked={formData.announcement_type === 'important'}
                    onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as AnnouncementType })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">Important</div>
                    <div className="text-sm text-gray-500">Sticky banner - stays visible until dismissed</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="announcement_type"
                    value="urgent"
                    checked={formData.announcement_type === 'urgent'}
                    onChange={(e) => setFormData({ ...formData, announcement_type: e.target.value as AnnouncementType })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-red-600">Urgent</div>
                    <div className="text-sm text-gray-500">Requires acknowledgment - blocks other actions</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Target Scope */}
            <div>
              <Label htmlFor="target_scope">Audience *</Label>
              <select
                id="target_scope"
                value={formData.target_scope}
                onChange={(e) => setFormData({ ...formData, target_scope: e.target.value as TargetScope })}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Managers</option>
                <option value="team">Specific Team (Not Implemented)</option>
                <option value="individuals">Specific Individuals (Not Implemented)</option>
              </select>
            </div>

            {/* Require Acknowledgement */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_ack"
                checked={formData.require_acknowledgement}
                onChange={(e) => setFormData({ ...formData, require_acknowledgement: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="require_ack" className="cursor-pointer">
                Require acknowledgment (recommended for Important/Urgent)
              </Label>
            </div>

            {/* Sticky Until (Optional) */}
            <div>
              <Label htmlFor="sticky_until">Sticky Until (Optional)</Label>
              <input
                id="sticky_until"
                type="datetime-local"
                value={formData.sticky_until}
                onChange={(e) => setFormData({ ...formData, sticky_until: e.target.value })}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">If set, announcement will remain sticky until this date</p>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/announcements')}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !formData.title || !formData.content}
              className="min-w-32"
            >
              <Send className="mr-2 h-4 w-4" />
              {submitting ? 'Publishing...' : 'Publish'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
