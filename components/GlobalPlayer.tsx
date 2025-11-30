import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, Square, Repeat, Volume2, SkipBack, SkipForward } from 'lucide-react';

const GlobalPlayer: React.FC = () => {
    const { currentSound, isPlaying, volume, isLooping, progress, play, pause, stop, setVolume, toggleLoop } = usePlayer();

    if (!currentSound) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-gray-900/95 backdrop-blur-md border-t border-gray-800 p-4 z-50 flex items-center justify-between shadow-2xl animate-in slide-in-from-bottom-full duration-300">

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-800 cursor-pointer group">
                <div
                    className="h-full bg-primary-500 transition-all duration-100 ease-linear relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Track Info */}
            <div className="flex items-center gap-4 w-1/4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gray-800 border border-gray-700`} style={{ borderColor: currentSound.color }}>
                    <span className="text-xl font-bold" style={{ color: currentSound.color }}>{currentSound.shortcut || '♪'}</span>
                </div>
                <div className="overflow-hidden">
                    <h3 className="font-bold text-white truncate">{currentSound.name}</h3>
                    <p className="text-xs text-gray-400 truncate">Playing from FunSounds</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 flex-1">
                <button className="text-gray-400 hover:text-white transition-colors" onClick={() => { }}>
                    <SkipBack className="w-5 h-5" />
                </button>

                <button
                    onClick={isPlaying ? pause : () => play(currentSound)}
                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg shadow-white/10"
                >
                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
                </button>

                <button className="text-gray-400 hover:text-white transition-colors" onClick={stop}>
                    <Square className="w-4 h-4 fill-current" />
                </button>
            </div>

            {/* Volume & Options */}
            <div className="flex items-center justify-end gap-4 w-1/4">
                <button
                    onClick={toggleLoop}
                    className={`p-2 rounded-full transition-colors ${isLooping ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-white'}`}
                >
                    <Repeat className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 group">
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
                    />
                </div>
            </div>
        </div>
    );
};

export default GlobalPlayer;
