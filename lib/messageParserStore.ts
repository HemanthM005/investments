import { create } from 'zustand';

export interface ParsedMessage {
  id: string;
  raw_text: string;
  type: 'expense' | 'income' | 'payment' | 'transfer' | 'subscription' | 'unknown';
  amount?: number;
  currency: 'INR' | 'USD';
  date: string; // YYYY-MM-DD
  category?: string;
  description: string;
  person_name?: string;
  payment_method?: string;
  account_name?: string;
  confidence: number; // 0-1
  parsed_at: string; // ISO timestamp
  status: 'pending' | 'approved' | 'rejected' | 'imported';
  notes?: string;
}

interface MessageParserState {
  messages: ParsedMessage[];
  loading: boolean;
  error: string | null;

  // Actions
  addParsedMessage: (msg: Omit<ParsedMessage, 'id' | 'parsed_at' | 'status'>) => void;
  updateMessage: (id: string, updates: Partial<ParsedMessage>) => void;
  approveMessage: (id: string) => void;
  rejectMessage: (id: string) => void;
  importMessage: (id: string) => Promise<void>;
  deleteMessage: (id: string) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMessageParserStore = create<MessageParserState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  addParsedMessage: (msg) => {
    const newMessage: ParsedMessage = {
      ...msg,
      id: crypto.randomUUID(),
      parsed_at: new Date().toISOString(),
      status: 'pending',
    };
    set((state) => ({
      messages: [newMessage, ...state.messages],
    }));
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  },

  approveMessage: (id) => {
    get().updateMessage(id, { status: 'approved' });
  },

  rejectMessage: (id) => {
    get().updateMessage(id, { status: 'rejected' });
  },

  importMessage: async (id) => {
    const msg = get().messages.find((m) => m.id === id);
    if (!msg || !msg.amount || !msg.date) {
      set({ error: 'Cannot import: missing required fields' });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Import based on type
      if (msg.type === 'expense') {
        // POST to expense API
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'expenses',
            action: 'add',
            data: {
              date: msg.date,
              amount: msg.amount,
              category: msg.category || 'Other',
              payment_source_name: msg.account_name || 'Unknown',
              payment_source_id: '', // Will be set by user later
              description: msg.description,
              notes: `Auto-parsed from: ${msg.raw_text}`,
            },
          }),
        });

        if (!res.ok) throw new Error('Failed to import expense');
      } else if (msg.type === 'payment' || msg.type === 'transfer') {
        // POST to money tracker (lent/borrowed)
        const res = await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: 'money_records',
            action: 'add',
            data: {
              type: 'lent', // or 'borrowed' based on context
              person_name: msg.person_name || 'Unknown',
              amount: msg.amount,
              settled_amount: 0,
              date: msg.date,
              due_date: msg.date,
              description: msg.description,
              status: 'pending',
            },
          }),
        });

        if (!res.ok) throw new Error('Failed to import payment record');
      }

      get().updateMessage(id, { status: 'imported' });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Import failed',
      });
    } finally {
      set({ loading: false });
    }
  },

  deleteMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
