import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Sound } from '../types';

interface PlayerContextType {
    currentSound: Sound | null;
    isPlaying: boolean;
    volume: number;
    isLooping: boolean;
    progress: number;
    play: (sound: Sound) => void;
    pause: () => void;
    stop: () => void;
    setVolume: (vol: number) => void;
    toggleLoop: () => void;
    audioContext: AudioContext | null;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentSound, setCurrentSound] = useState<Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isLooping, setIsLooping] = useState(false);
    const [progress, setProgress] = useState(0);
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const startTimeRef = useRef<number>(0);
    const rafRef = useRef<number>(0);
    const audioBufferRef = useRef<AudioBuffer | null>(null);

    useEffect(() => {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        return () => {
            ctx.close();
        };
    }, []);

    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = volume;
        }
    }, [volume]);

    useEffect(() => {
        if (sourceRef.current) {
            sourceRef.current.loop = isLooping;
        }
    }, [isLooping]);

    const updateProgress = () => {
        if (!audioContext || !startTimeRef.current || !audioBufferRef.current) return;
        const elapsed = audioContext.currentTime - startTimeRef.current;
        const duration = audioBufferRef.current.duration;
        const p = (elapsed % duration) / duration;
        setProgress(p * 100);

        if (isPlaying) {
            rafRef.current = requestAnimationFrame(updateProgress);
        }
    };

    const stopCurrent = () => {
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) { /* ignore */ }
            sourceRef.current = null;
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setIsPlaying(false);
        setProgress(0);
    };

    const play = async (sound: Sound) => {
        if (!audioContext) return;

        // If same sound is clicked and playing, pause it (or restart? User asked for exclusive playback)
        // Let's say clicking same sound restarts it or toggles pause. 
        // Standard behavior for "Soundboard" is usually restart, but "Media Player" is toggle.
        // Given "Universal Media Control", let's behave like a player.
        if (currentSound?.id === sound.id && isPlaying) {
            stopCurrent(); // Toggle off
            return;
        }

        stopCurrent();
        setCurrentSound(sound);
        // Reset loop/volume to sound defaults if new sound, or keep global?
        // "Universal media control" usually implies global volume.
        // Let's keep global volume, but maybe reset loop?
        // Let's keep global loop state for now, or reset it. Resetting feels safer for a soundboard.
        setIsLooping(sound.loop || false);

        if (sound.blob) {
            const arrayBuffer = await sound.blob.arrayBuffer();
            const decoded = await audioContext.decodeAudioData(arrayBuffer);
            audioBufferRef.current = decoded;

            const source = audioContext.createBufferSource();
            source.buffer = decoded;
            source.loop = sound.loop || false; // Initial loop state from sound

            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);

            source.onended = () => {
                // Check if we are still the current sound (might have been replaced)
                // We can't easily check 'isLooping' state inside this callback reliably without ref, 
                // but source.loop handles the actual looping.
                // If it ends, it means it's done.
                if (!source.loop) {
                    setIsPlaying(false);
                    setProgress(0);
                    if (rafRef.current) cancelAnimationFrame(rafRef.current);
                }
            };

            source.start(0);
            sourceRef.current = source;
            gainNodeRef.current = gainNode;
            startTimeRef.current = audioContext.currentTime;
            setIsPlaying(true);
            rafRef.current = requestAnimationFrame(updateProgress);
        }
    };

    const pause = () => {
        stopCurrent();
    };

    const stop = () => {
        stopCurrent();
        setCurrentSound(null);
    };

    const toggleLoop = () => {
        setIsLooping(!isLooping);
    };

    return (
        <PlayerContext.Provider value={{
            currentSound, isPlaying, volume, isLooping, progress,
            play, pause, stop, setVolume, toggleLoop, audioContext
        }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => {
    const context = useContext(PlayerContext);
    if (!context) {
        throw new Error('usePlayer must be used within a PlayerProvider');
    }
    return context;
};
