import { Sound, SoundBoard } from '../types';

// Helper to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:audio/wav;base64,")
      const base64 = base64String.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Helper to convert Base64 to Blob
const base64ToBlob = (base64: string, type: string = 'audio/wav'): Blob => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type });
};

export const loadBoards = async (): Promise<SoundBoard[]> => {
  const response = await fetch('/api/boards');
  if (!response.ok) throw new Error('Failed to load boards');

  const boards = await response.json() as any[];

  // Process boards to convert base64 audio back to Blobs
  return boards.map((board: any) => ({
    ...board,
    sounds: board.sounds.map((s: any) => ({
      ...s,
      blob: s.audioData ? base64ToBlob(s.audioData) : undefined,
      audioData: undefined // Clean up
    }))
  }));
};

export const saveBoard = async (board: SoundBoard): Promise<void> => {
  // Only save board metadata here. Sounds are saved individually.
  const { sounds, ...metadata } = board;

  const response = await fetch('/api/boards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });

  if (!response.ok) throw new Error('Failed to save board');
};

export const deleteBoard = async (id: string): Promise<void> => {
  const response = await fetch(`/api/boards/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete board');
};

export const saveSound = async (sound: Sound, boardId: string): Promise<void> => {
  let audioData = null;
  if (sound.blob) {
    audioData = await blobToBase64(sound.blob);
  }

  const payload = {
    ...sound,
    board_id: boardId,
    audioData,
    blob: undefined // Don't send blob object
  };

  const response = await fetch('/api/sounds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error('Failed to save sound');
};

export const deleteSound = async (id: string): Promise<void> => {
  const response = await fetch(`/api/sounds/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete sound');
};
