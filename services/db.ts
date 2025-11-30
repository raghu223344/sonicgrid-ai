import { Sound, SoundBoard } from '../types';

const DB_NAME = 'SonicGridDB';
const DB_VERSION = 1;
const STORE_BOARDS = 'boards';
const STORE_SOUNDS = 'sounds'; // We store blobs separately to avoid massive JSON objects

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_BOARDS)) {
        db.createObjectStore(STORE_BOARDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SOUNDS)) {
        db.createObjectStore(STORE_SOUNDS, { keyPath: 'id' });
      }
    };
  });
};

export const saveBoard = async (board: SoundBoard): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    // Separate blobs from board data to keep metadata light
    const soundsMetadata = board.sounds.map(s => {
      const { blob, ...meta } = s;
      return meta;
    });

    const boardToSave = { ...board, sounds: soundsMetadata };

    const transaction = db.transaction([STORE_BOARDS, STORE_SOUNDS], 'readwrite');
    
    // Save Board Metadata
    transaction.objectStore(STORE_BOARDS).put(boardToSave);

    // Save Sound Blobs
    const soundStore = transaction.objectStore(STORE_SOUNDS);
    board.sounds.forEach(s => {
      if (s.blob) {
        soundStore.put({ id: s.id, blob: s.blob });
      }
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const loadBoards = async (): Promise<SoundBoard[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_BOARDS, STORE_SOUNDS], 'readonly');
    const boardStore = transaction.objectStore(STORE_BOARDS);
    const soundStore = transaction.objectStore(STORE_SOUNDS);

    const boardRequest = boardStore.getAll();

    boardRequest.onsuccess = async () => {
      const boards = boardRequest.result as any[];
      
      // Re-attach blobs
      const populatedBoards = await Promise.all(boards.map(async (board) => {
        const sounds = await Promise.all(board.sounds.map(async (soundMeta: Sound) => {
          return new Promise<Sound>((res) => {
             const blobReq = soundStore.get(soundMeta.id);
             blobReq.onsuccess = () => {
               res({ ...soundMeta, blob: blobReq.result?.blob });
             };
             blobReq.onerror = () => res(soundMeta); // Fallback if blob missing
          });
        }));
        return { ...board, sounds };
      }));
      
      resolve(populatedBoards);
    };

    boardRequest.onerror = () => reject(boardRequest.error);
  });
};

export const deleteBoard = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_BOARDS], 'readwrite');
        transaction.objectStore(STORE_BOARDS).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
