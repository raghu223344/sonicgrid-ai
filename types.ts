export interface Sound {
  id: string;
  name: string;
  source: 'upload' | 'mic' | 'ai';
  blob?: Blob; // For playback
  color: string;
  icon?: string;
  volume: number;
  loop: boolean;
  shortcut?: string;
  createdBy?: string;
}

export interface SoundBoard {
  id: string;
  name: string;
  columns: number;
  gap: number;
  sounds: Sound[];
}

export interface AppState {
  boards: SoundBoard[];
  activeBoardId: string;
  isEditMode: boolean;
}

export type LayoutConfig = {
  columns: number;
  gap: number;
};
