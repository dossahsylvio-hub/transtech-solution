/**
 * IndexedDB-based offline storage for Bor-Bi PWA
 */

const DB_NAME = 'borbi-offline';
const DB_VERSION = 1;

interface PendingOperation {
  id: string;
  type: 'transaction' | 'stock_update' | 'client_create';
  data: Record<string, unknown>;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingOps')) {
        db.createObjectStore('pendingOps', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
    };
  });
}

export async function saveToOfflineStore(storeName: string, data: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFromOfflineStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingOperation(op: PendingOperation): Promise<void> {
  return saveToOfflineStore('pendingOps', op as unknown as Record<string, unknown>);
}

export async function getPendingOperations(): Promise<PendingOperation[]> {
  return getFromOfflineStore<PendingOperation>('pendingOps');
}

export async function removePendingOperation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pendingOps', 'readwrite');
    const store = tx.objectStore('pendingOps');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingOperations(apiFetch: (url: string, options?: RequestInit) => Promise<unknown>): Promise<{ synced: number; failed: number }> {
  const ops = await getPendingOperations();
  let synced = 0;
  let failed = 0;

  for (const op of ops) {
    try {
      switch (op.type) {
        case 'transaction':
          await apiFetch('/api/vendor/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.data),
          });
          break;
        case 'stock_update':
          await apiFetch('/api/vendor/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.data),
          });
          break;
        case 'client_create':
          await apiFetch('/api/vendor/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(op.data),
          });
          break;
      }
      await removePendingOperation(op.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function registerServiceWorker(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed
      });
    });
  }
}
