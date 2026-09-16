import { create } from 'zustand';
import { useExpenseStore } from './expenseStore';
import { useMoneyStore } from './moneyStore';
import { useRecurringStore } from './recurringStore';
import type { ExpenseCategory } from './types';

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
  // Set on import so deleting the message can also remove what it created.
  // Without this the imported record is unreachable from here.
  imported_section?: 'expenses' | 'money_records' | 'recurring';
  imported_id?: string;
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
  deleteMessage: (id: string, alsoDeleteRecord?: boolean) => void;
  clearMessages: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const CATEGORY_ALIASES: Record<string, ExpenseCategory> = {
  food: 'Food & Dining', dining: 'Food & Dining', restaurant: 'Food & Dining',
  grocery: 'Groceries', groceries: 'Groceries',
  travel: 'Transport & Travel', transport: 'Transport & Travel', fuel: 'Transport & Travel',
  shopping: 'Shopping', entertainment: 'Entertainment',
  health: 'Health & Medical', healthcare: 'Health & Medical', medical: 'Health & Medical',
  bills: 'Bills & Utilities', utilities: 'Bills & Utilities',
  education: 'Education', rent: 'Rent', subscription: 'Subscriptions',
  subscriptions: 'Subscriptions', fitness: 'Sports & Fitness', loan: 'Loan & EMI',
  emi: 'Loan & EMI', gifts: 'Gifts & Donations',
};

/**
 * The model returns loose labels ("Food", "Bills") but Expense.category is a
 * fixed union ("Food & Dining"). Map what we recognise, fall back to Other.
 */
function toExpenseCategory(raw?: string | null): ExpenseCategory {
  if (!raw) return 'Other';
  const key = raw.trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? CATEGORY_ALIASES[key.split(/[ &/]/)[0]] ?? 'Other';
}

/**
 * Money in means someone paid you (you owe nothing — record it as borrowed
 * only when the text says so). Debits default to lent.
 */
function inferDirection(text: string): 'lent' | 'borrowed' {
  return /\b(credited|received|from)\b/i.test(text) ? 'borrowed' : 'lent';
}

/** moneyStore/recurringStore append without returning an id — read it back. */
function lastIdOf(
  items: { id: string }[],
  section: 'money_records' | 'recurring',
): Pick<ParsedMessage, 'imported_section' | 'imported_id'> {
  const last = items[items.length - 1];
  return last ? { imported_section: section, imported_id: last.id } : {};
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
      const notes = `Auto-parsed from: ${msg.raw_text}`;
      let imported: Pick<ParsedMessage, 'imported_section' | 'imported_id'> = {};

      switch (msg.type) {
        case 'expense': {
          const newId = useExpenseStore.getState().addExpense({
            date: msg.date,
            amount: msg.amount,
            category: toExpenseCategory(msg.category),
            payment_source_id: '',
            payment_source_name: msg.account_name || 'Unknown',
            description: msg.description,
            notes,
          });
          imported = { imported_section: 'expenses', imported_id: newId };
          break;
        }

        case 'subscription': {
          useRecurringStore.getState().addRecurring({
            name: msg.description || msg.account_name || 'Subscription',
            amount: msg.amount,
            frequency: 'Monthly',
            category: 'Subscriptions',
            payment_source_id: '',
            payment_source_name: msg.account_name || 'Unknown',
            next_due: msg.date,
            start_date: msg.date,
            active: true,
            notes,
          });
          imported = lastIdOf(useRecurringStore.getState().recurring, 'recurring');
          break;
        }

        case 'payment':
        case 'transfer': {
          useMoneyStore.getState().addRecord({
            type: inferDirection(msg.raw_text),
            person_name: msg.person_name || 'Unknown',
            amount: msg.amount,
            settled_amount: 0,
            date: msg.date,
            due_date: msg.date,
            description: msg.description,
            status: 'pending',
          });
          imported = lastIdOf(useMoneyStore.getState().records, 'money_records');
          break;
        }

        default:
          // 'income' and 'unknown' have no destination section yet. Say so
          // rather than marking the message imported and dropping it.
          set({ error: `No destination for type "${msg.type}" — add it manually.` });
          return;
      }

      get().updateMessage(id, { status: 'imported', ...imported });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      set({ loading: false });
    }
  },

  deleteMessage: (id, alsoDeleteRecord = false) => {
    const msg = get().messages.find((m) => m.id === id);

    // Deleting the message alone leaves whatever the import created behind,
    // which is almost never what someone means by "delete".
    if (alsoDeleteRecord && msg?.imported_id && msg.imported_section) {
      switch (msg.imported_section) {
        case 'expenses':
          useExpenseStore.getState().deleteExpense(msg.imported_id);
          break;
        case 'money_records':
          useMoneyStore.getState().deleteRecord(msg.imported_id);
          break;
        case 'recurring':
          useRecurringStore.getState().deleteRecurring(msg.imported_id);
          break;
      }
    }

    set((state) => ({ messages: state.messages.filter((m) => m.id !== id) }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
