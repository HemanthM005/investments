import type { ParsedMessage } from './messageParserStore';

// SQLite helper with localStorage fallback for web
// In native mobile build (Capacitor), use actual SQLite via CapacitorSQLite

const DB_KEY = 'investments_db';

interface DbData {
  messages: ParsedMessage[];
  sms_log: Array<{
    id: string;
    phone_number: string;
    message_text: string;
    received_at: string;
    processed: boolean;
    parsed_message_id?: string;
  }>;
}

function getDb(): DbData {
  if (typeof window === 'undefined') return { messages: [], sms_log: [] };

  try {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : { messages: [], sms_log: [] };
  } catch {
    return { messages: [], sms_log: [] };
  }
}

function saveDb(data: DbData) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Save DB error:', err);
  }
}

export async function saveParsedMessage(msg: ParsedMessage) {
  try {
    const db = getDb();
    // Remove existing message with same id if any
    db.messages = db.messages.filter((m) => m.id !== msg.id);
    // Add new message at the beginning
    db.messages.unshift(msg);
    saveDb(db);
  } catch (err) {
    console.error('Save parsed message error:', err);
    throw err;
  }
}

export async function getParsedMessages(
  status?: 'pending' | 'approved' | 'rejected' | 'imported'
) {
  try {
    const db = getDb();
    return status
      ? db.messages.filter((m) => m.status === status)
      : db.messages;
  } catch (err) {
    console.error('Get parsed messages error:', err);
    return [];
  }
}

export async function saveSmsLog(
  id: string,
  phoneNumber: string,
  messageText: string,
  parsedMessageId?: string
) {
  try {
    const db = getDb();
    db.sms_log.push({
      id,
      phone_number: phoneNumber,
      message_text: messageText,
      received_at: new Date().toISOString(),
      processed: !!parsedMessageId,
      parsed_message_id: parsedMessageId,
    });
    // Keep only last 100 entries
    if (db.sms_log.length > 100) {
      db.sms_log = db.sms_log.slice(0, 100);
    }
    saveDb(db);
  } catch (err) {
    console.error('Save SMS log error:', err);
  }
}

export async function getSmsLog(limit: number = 50) {
  try {
    const db = getDb();
    return db.sms_log.slice(0, limit);
  } catch (err) {
    console.error('Get SMS log error:', err);
    return [];
  }
}

export async function closeDb() {
  // No-op for web/localStorage
}
