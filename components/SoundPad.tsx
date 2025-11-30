import React from 'react';
import { Play, Square, Settings, Trash2, Repeat } from 'lucide-react';
import { Sound } from '../types';
import { usePlayer } from '../context/PlayerContext';
import { useAuth } from '../auth/AuthContext';

interface SoundPadProps {
  sound: Sound;
  isEditMode: boolean;
  onPlay: (id: string) => void;
  onEdit: (sound: Sound) => void;
  onDelete: (id: string) => void;
  audioContext: AudioContext | null; // Deprecated, kept for interface compat if needed
}

const SoundPad: React.FC<SoundPadProps> = ({ sound, isEditMode, onPlay, onEdit, onDelete }) => {
  const { currentSound, isPlaying: isGlobalPlaying, play, pause, stop } = usePlayer();
  const { user } = useAuth();

  const isPlaying = currentSound?.id === sound.id && isGlobalPlaying;
  // We don't show local progress/volume anymore on the pad itself if we have a global player, 
  // OR we can show it if we want, but the global player is the "Universal Media Control".
  // The user asked for "Universal media control templet down side of the screen".
  // So the pad can just be a trigger.
  // However, showing "Active" state is good.

  const handleClick = () => {
    if (isEditMode) {
      // RBAC Check for Edit
      if (sound.createdBy === 'admin' && user !== 'admin') {
        alert("You cannot edit sounds created by Admin.");
        return;
      }
      onEdit(sound);
    } else {
      if (isPlaying) {
        pause();
      } else {
        play(sound);
      }
    }
  };

  const borderColor = isPlaying ? `border-${sound.color}-400` : 'border-gray-700';
  const glow = isPlaying ? `shadow-[0_0_15px_rgba(var(--color-${sound.color}-500),0.5)]` : '';

  // RBAC for Delete Button visibility
  const canDelete = !(sound.createdBy === 'admin' && user !== 'admin');

  return (
    <div
      className={`relative group aspect-square rounded-xl bg-gray-800 border-2 ${borderColor} ${glow} 
      transition-all duration-150 hover:border-gray-500 overflow-hidden cursor-pointer select-none
      flex flex-col items-center justify-center`}
      onClick={handleClick}
      style={{ borderColor: isPlaying ? sound.color : undefined }}
    >
      <div className="absolute top-2 right-2 opacity-50 text-xs font-mono uppercase tracking-widest text-gray-400 z-0">
        {sound.shortcut}
      </div>

      <div className={`text-3xl mb-2 transition-transform duration-100 ${isPlaying ? 'scale-110' : ''} z-0`} style={{ color: sound.color }}>
        {isPlaying ? <Play fill="currentColor" /> : <Square fill="currentColor" className="opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>

      <div className="text-center px-2 z-0">
        <h3 className="text-sm font-bold text-gray-200 truncate w-full">{sound.name}</h3>
      </div>

      {/* Edit Overlay */}
      {isEditMode && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-in fade-in duration-200">
          <Settings className="w-8 h-8 text-white mb-1" />
          <span className="text-xs text-gray-300 font-medium">Edit Sound</span>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(sound.id); }}
              className="absolute top-2 right-2 p-1.5 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {isPlaying && (
        <div className="absolute inset-0 bg-white/5 pointer-events-none animate-pulse" />
      )}
    </div>
  );
};

export default SoundPad;
