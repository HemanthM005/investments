'use client';

import { useEffect, useState } from 'react';
import { useMessageParserStore, type ParsedMessage } from '@/lib/messageParserStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Check, X, Upload, MessageSquare, Zap } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

export default function MessageParserPage() {
  const store = useMessageParserStore();
  const [testMessage, setTestMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [parsing, setParsing] = useState(false);

  const filteredMessages =
    filterStatus === 'all'
      ? store.messages
      : store.messages.filter((m) => m.status === filterStatus);

  const handleParseMessage = async () => {
    if (!testMessage.trim()) return;

    setParsing(true);
    try {
      const res = await fetch('/api/parse-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: testMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        store.setError(`Parse error: ${data.error}`);
        setParsing(false);
        return;
      }

      store.addParsedMessage(data.data);
      setTestMessage('');
      store.setError(null);
    } catch (err) {
      store.setError(
        err instanceof Error ? err.message : 'Failed to parse message'
      );
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async (id: string) => {
    store.setLoading(true);
    await store.importMessage(id);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-400" />
          Message Parser
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Auto-extract financial data from SMS & notifications using AI
        </p>
      </div>

      {/* Test Parser */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label htmlFor="test-message">Test Parse Message</Label>
            <Textarea
              id="test-message"
              placeholder="Paste an SMS or notification here... e.g., UPI: Sent ₹500 to John via HDFC Bank"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="min-h-20 mt-2"
            />
          </div>
          <Button
            onClick={handleParseMessage}
            disabled={parsing || !testMessage.trim()}
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {parsing ? 'Parsing...' : 'Parse with AI'}
          </Button>
        </CardContent>
      </Card>

      {/* Error message */}
      {store.error && (
        <div className="rounded-lg border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {store.error}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label>Filter:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="imported">Imported</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">
          {filteredMessages.length} message{filteredMessages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No {filterStatus !== 'all' ? filterStatus : ''} messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map((msg) => (
            <ParsedMessageCard
              key={msg.id}
              message={msg}
              onApprove={() => store.approveMessage(msg.id)}
              onReject={() => store.rejectMessage(msg.id)}
              onImport={() => handleImport(msg.id)}
              onDelete={() => store.deleteMessage(msg.id)}
              loading={store.loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  message: ParsedMessage;
  onApprove: () => void;
  onReject: () => void;
  onImport: () => void;
  onDelete: () => void;
  loading: boolean;
}

function ParsedMessageCard({
  message,
  onApprove,
  onReject,
  onImport,
  onDelete,
  loading,
}: CardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-950/30 border-amber-700/40 text-amber-300',
    approved: 'bg-emerald-950/30 border-emerald-700/40 text-emerald-300',
    imported: 'bg-indigo-950/30 border-indigo-700/40 text-indigo-300',
    rejected: 'bg-red-950/30 border-red-700/40 text-red-300',
  };

  const typeColors: Record<string, string> = {
    expense: 'bg-red-900/50 text-red-300',
    income: 'bg-emerald-900/50 text-emerald-300',
    payment: 'bg-orange-900/50 text-orange-300',
    transfer: 'bg-blue-900/50 text-blue-300',
    subscription: 'bg-purple-900/50 text-purple-300',
    unknown: 'bg-slate-700/50 text-slate-300',
  };

  return (
    <Card className={cn('border', statusColors[message.status])}>
      <CardContent className="p-4 space-y-3">
        {/* Top row: Type, Amount, Confidence */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                typeColors[message.type]
              )}
            >
              {message.type.charAt(0).toUpperCase() + message.type.slice(1)}
            </span>
            {message.category && (
              <span className="text-xs text-slate-400 bg-[#1a1d2e] px-2 py-1 rounded">
                {message.category}
              </span>
            )}
            <span className="text-xs text-slate-500">
              Confidence: {Math.round(message.confidence * 100)}%
            </span>
          </div>
          <span
            className={cn(
              'text-lg font-semibold',
              message.type === 'expense' || message.type === 'payment'
                ? 'text-red-400'
                : 'text-emerald-400'
            )}
          >
            {message.amount ? formatCurrency(message.amount) : '—'}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Date</p>
            <p className="text-slate-300">{message.date}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Description</p>
            <p className="text-slate-300 truncate">{message.description}</p>
          </div>
          {message.person_name && (
            <div>
              <p className="text-xs text-slate-500">Person</p>
              <p className="text-slate-300">{message.person_name}</p>
            </div>
          )}
          {message.account_name && (
            <div>
              <p className="text-xs text-slate-500">Account</p>
              <p className="text-slate-300">{message.account_name}</p>
            </div>
          )}
        </div>

        {/* Raw message */}
        <div className="bg-[#0f1117] rounded p-2 text-xs text-slate-400">
          <p className="font-mono truncate">"{message.raw_text}"</p>
        </div>

        {/* Notes input (if approved or imported) */}
        {(message.status === 'approved' || message.status === 'imported') && (
          <div className="text-xs text-slate-500">
            {message.notes && <p>Notes: {message.notes}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          {message.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onApprove}
                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReject}
                className="text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}

          {message.status === 'approved' && (
            <Button
              size="sm"
              onClick={onImport}
              disabled={loading}
              className="gap-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <Upload className="h-3.5 w-3.5" />
              {loading ? 'Importing...' : 'Import'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-8 w-8 text-slate-400 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
