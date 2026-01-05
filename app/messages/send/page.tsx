'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
}

type MessageType = 'consultation' | 'direction' | 'clarification';
type ContextType = 'request' | 'announcement' | 'general';

export default function SendMessagePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string>('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [messageType, setMessageType] = useState<MessageType>('consultation');
  const [contextType, setContextType] = useState<ContextType>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [ccUsers, setCcUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('ceo_users')
        .select('role_code')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserRole(profile.role_code);
      }

      // Get all users in org
      const { data: users } = await supabase
        .from('ceo_users')
        .select('id, email, full_name')
        .eq('is_active', true);

      if (users) {
        setAllUsers(users.filter(u => u.id !== user.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    try {
      setError('');
      setSending(true);

      // Validation
      if (!subject.trim()) {
        setError('Subject is required');
        return;
      }

      if (!body.trim()) {
        setError('Message body is required');
        return;
      }

      if (selectedRecipients.size === 0) {
        setError('At least one recipient is required');
        return;
      }

      if (contextType !== 'general' && !contextType) {
        setError('Context type is required for non-general messages');
        return;
      }

      // Create message (draft)
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_type: messageType,
          context_type: contextType,
          context_id: null,
          subject: subject.trim(),
          body: body.trim(),
          recipient_ids: Array.from(selectedRecipients),
          cc_user_ids: Array.from(ccUsers),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create message');
      }

      const data = await res.json();
      const messageId = data.message.id;

      // Send message
      const sendRes = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send' }),
      });

      if (!sendRes.ok) {
        const sendData = await sendRes.json();
        throw new Error(sendData.error || 'Failed to send message');
      }

      // Success
      router.push('/messages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="gap-2 mb-4"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">New Message</h1>
          <p className="text-gray-600 mt-1">Send a message to managers or the CEO</p>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 p-4 mb-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-6">
          {/* Message Type */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Message Type</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['consultation', 'direction', 'clarification'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setMessageType(type)}
                  className={`p-4 border-2 rounded-lg transition-all text-center ${
                    messageType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium capitalize text-sm">
                    {type === 'consultation'
                      ? '❓ Asking'
                      : type === 'direction'
                        ? '📋 Directing'
                        : '💬 Clarifying'}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {type === 'consultation'
                      ? 'Need approval?'
                      : type === 'direction'
                        ? 'Instruction'
                        : 'Clarify details'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Context Type */}
          {userRole !== 'MANAGER' && (
            <div>
              <Label className="text-base font-semibold mb-3 block">Context (optional for CEO)</Label>
              <div className="grid grid-cols-3 gap-3">
                {(['general', 'request', 'announcement'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setContextType(type)}
                    className={`p-3 border-2 rounded-lg transition-all text-center ${
                      contextType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium capitalize text-sm">{type}</div>
                  </button>
                ))}
              </div>
              {contextType === 'general' && userRole === 'MANAGER' && (
                <p className="text-xs text-red-600 mt-2">⚠️ Only CEO can send general messages</p>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <Label htmlFor="subject" className="text-base font-semibold mb-2 block">
              Subject
            </Label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject line"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <Label htmlFor="body" className="text-base font-semibold mb-2 block">
              Message
            </Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              placeholder="Write your message here..."
              rows={6}
              className="font-sans"
            />
          </div>

          {/* Recipients */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Recipients ({selectedRecipients.size})
            </Label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {allUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecipients.has(user.id)}
                    onChange={(e) => {
                      const updated = new Set(selectedRecipients);
                      if (e.target.checked) {
                        updated.add(user.id);
                      } else {
                        updated.delete(user.id);
                      }
                      setSelectedRecipients(updated);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{user.full_name || user.email}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* CC Users */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              CC ({ccUsers.size})
            </Label>
            <div className="border border-gray-300 rounded-lg max-h-32 overflow-y-auto">
              {allUsers.map((user) => (
                <label
                  key={`cc-${user.id}`}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={ccUsers.has(user.id)}
                    onChange={(e) => {
                      const updated = new Set(ccUsers);
                      if (e.target.checked) {
                        updated.add(user.id);
                      } else {
                        updated.delete(user.id);
                      }
                      setCcUsers(updated);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{user.full_name || user.email}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="flex-1"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
