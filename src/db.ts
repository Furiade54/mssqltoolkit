// Simple IndexedDB helper for storing MSSQL card queries locally
export type StoredCard = {
  id: string;
  title: string;
  subtitle?: string;
  value?: string; // store as string; UI can render it directly
  icon?: string;
  codigoAplicacion: string;
  descripcion: string;
  consulta: string;
  reporteAsociado?: string;
  createdAt?: string;
  updatedAt?: string;
};

const DB_NAME = "electron-react-tailwind";
const STORE_NAME = "cardQueries";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        try {
          store.createIndex("descripcion", "descripcion", { unique: false });
          store.createIndex("codigoAplicacion", "codigoAplicacion", { unique: false });
        } catch {}
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCard(card: StoredCard): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const now = new Date().toISOString();
    const data: StoredCard = { ...card, updatedAt: now, createdAt: card.createdAt || now };
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); };
    tx.onerror = () => { try { db.close(); } catch {} };
  });
}

export async function getAllCards(): Promise<StoredCard[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as StoredCard[]) : []);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); };
    tx.onerror = () => { try { db.close(); } catch {} };
  });
}

export async function deleteCard(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); };
    tx.onerror = () => { try { db.close(); } catch {} };
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => { db.close(); };
    tx.onerror = () => { try { db.close(); } catch {} };
  });
}