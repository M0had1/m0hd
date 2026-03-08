import type { Conversation, Message } from '@/types/chat';

const DB_NAME = 'mohameds-ai-offline';
const DB_VERSION = 1;
const CONVERSATIONS_STORE = 'conversations';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Serialise dates to JSON-safe format for IndexedDB storage */
function serialiseConversation(conv: Conversation) {
  return {
    ...conv,
    createdAt: conv.createdAt instanceof Date ? conv.createdAt.toISOString() : conv.createdAt,
    updatedAt: conv.updatedAt instanceof Date ? conv.updatedAt.toISOString() : conv.updatedAt,
    messages: conv.messages.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      // Strip large base64 image data from offline cache to save space
      attachments: m.attachments?.map(a => ({
        ...a,
        content: a.type.startsWith('image/') ? undefined : a.content,
        url: a.type.startsWith('image/') ? undefined : a.url,
      })),
    })),
  };
}

function deserialiseConversation(raw: any): Conversation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    messages: (raw.messages || []).map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    })),
  };
}

/** Save all conversations to IndexedDB (replaces existing) */
export async function cacheConversations(conversations: Conversation[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite');
    const store = tx.objectStore(CONVERSATIONS_STORE);

    // Clear old cache and write fresh data
    store.clear();
    for (const conv of conversations) {
      store.put(serialiseConversation(conv));
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn('Offline cache write failed:', err);
  }
}

/** Load all cached conversations from IndexedDB */
export async function loadCachedConversations(): Promise<Conversation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(CONVERSATIONS_STORE, 'readonly');
    const store = tx.objectStore(CONVERSATIONS_STORE);

    const all: Conversation[] = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result || []).map(deserialiseConversation));
      req.onerror = () => reject(req.error);
    });

    db.close();
    // Sort by updatedAt descending to match server order
    return all.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (err) {
    console.warn('Offline cache read failed:', err);
    return [];
  }
}

/** Check if the browser is currently offline */
export function isOffline(): boolean {
  return !navigator.onLine;
}
