'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { DEFAULT_PRIORITY_METADATA } from '@/lib/constants/status';
import type { PriorityCode } from '@/lib/types/database';

export default function NewRequestPage() {
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityCode>('P3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority_code: priority,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save draft');
      }

      const { request } = await res.json();
      router.push(`/requests/${request.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // First create as draft
      const createRes = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          priority_code: priority,
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        throw new Error(data.error || 'Failed to create request');
      }

      const { request } = await createRes.json();

      // Then transition to SUBMITTED
      const submitRes = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_status: 'SUBMITTED',
        }),
      });

      if (!submitRes.ok) {
        const data = await submitRes.json();
        throw new Error(data.error || 'Failed to submit request');
      }

      router.push(`/requests/${request.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-foreground">New Request</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Create a new request for CEO review
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 rounded-lg border p-4 bg-error-bg border-error-border text-error-fg">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="bg-card rounded-lg border p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-2">
              Title <span className="text-error-fg">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your request"
              maxLength={200}
              className="w-full px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length}/200 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed explanation of your request, context, and expected outcome"
              rows={8}
              maxLength={10000}
              className="w-full px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-input resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/10,000 characters
            </p>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-foreground mb-2">
              Priority
            </label>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {(Object.keys(DEFAULT_PRIORITY_METADATA) as PriorityCode[]).map((code) => {
                const meta = DEFAULT_PRIORITY_METADATA[code];
                const isSelected = priority === code;
                
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setPriority(code)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="font-semibold text-foreground">{code}</span>
                    </div>
                    <p className="text-xs font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting || !title.trim()}
              className="px-6 py-3 rounded-lg border bg-card text-foreground font-semibold hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="px-6 py-3 rounded-lg border bg-card text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Help Text */}
          <div className="bg-info-bg border border-info-border rounded-lg p-4">
            <p className="text-sm text-info-fg">
              <strong>Tip:</strong> You can save your request as a draft and come back to it later, or submit it directly to the CEO for review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
