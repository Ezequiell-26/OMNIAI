/**
 * Mini-DB local (IndexedDB) de OmniAI Studio — Local-First.
 *
 * Capa de persistencia del navegador usada por `lib/db/conversations`,
 * `lib/db/secrets` y `lib/db/usage`. Nada sale del dispositivo: las
 * conversaciones, las claves BYOK cifradas y el registro de uso viven
 * únicamente en IndexedDB.
 *
 * Client-side only: en SSR `getLocalDB` rechaza y los llamadores lo
 * tratan como best-effort (try/catch).
 */

const DB_NAME = 'omniai-local'
const DB_VERSION = 1

export const LOCAL_STORES = ['conversations', 'secrets', 'usage'] as const
export type LocalStoreName = (typeof LOCAL_STORES)[number]

interface LocalDBStore {
  put: (store: LocalStoreName, value: unknown) => Promise<void>
  getAll: (store: LocalStoreName) => Promise<unknown[]>
  delete: (store: LocalStoreName, key: string) => Promise<void>
  clear: (store: LocalStoreName) => Promise<void>
}

/** keyPath de cada store (clave primaria del registro). */
const STORE_KEY_PATHS: Record<LocalStoreName, string> = {
  conversations: 'id',
  secrets: 'provider',
  usage: 'id',
}

let dbPromise: Promise<LocalDBStore> | null = null

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible (¿SSR?)'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of LOCAL_STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: STORE_KEY_PATHS[store] })
        }
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir IndexedDB'))
  })
}

function withStore<T>(
  db: IDBDatabase,
  store: LocalStoreName,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode)
    const request = run(tx.objectStore(store))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Operación IndexedDB fallida'))
  })
}

/** Devuelve (y cachea) la instancia de la DB local. */
export function getLocalDB(): Promise<LocalDBStore> {
  if (!dbPromise) {
    dbPromise = openDatabase().then((db) => ({
      async put(store, value) {
        await withStore(db, store, 'readwrite', (os) => os.put(value as never))
      },
      async getAll(store) {
        return withStore(db, store, 'readonly', (os) => os.getAll() as IDBRequest<unknown[]>)
      },
      async delete(store, key) {
        await withStore(db, store, 'readwrite', (os) => os.delete(key))
      },
      async clear(store) {
        await withStore(db, store, 'readwrite', (os) => os.clear())
      },
    }))
    // Si falla el arranque, permitir reintento en la próxima llamada.
    dbPromise.catch(() => {
      dbPromise = null
    })
  }
  return dbPromise
}
