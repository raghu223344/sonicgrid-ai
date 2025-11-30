import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Play, Pause, Scissors, ArrowLeft, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Sound } from '../types';
import { loadBoards, saveBoard } from '../services/db';

const AudioEditor: React.FC = () => {
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const regions = useRef<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loadedFile, setLoadedFile] = useState<File | null>(null);
    const [boards, setBoards] = useState<any[]>([]);
    const [selectedBoardId, setSelectedBoardId] = useState<string>('');
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            const b = await loadBoards();
            setBoards(b);
            if (b.length > 0) setSelectedBoardId(b[0].id);
        };
        init();

        if (waveformRef.current) {
            wavesurfer.current = WaveSurfer.create({
                container: waveformRef.current,
                waveColor: '#4b5563',
                progressColor: '#06b6d4',
                cursorColor: '#fff',
                barWidth: 2,
                barGap: 1,
                height: 128,
            });

            const wsRegions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
            regions.current = wsRegions;

            wavesurfer.current.on('play', () => setIsPlaying(true));
            wavesurfer.current.on('pause', () => setIsPlaying(false));
            wavesurfer.current.on('finish', () => setIsPlaying(false));

            wsRegions.enableDragSelection({
                color: 'rgba(6, 182, 212, 0.3)',
                drag: true,
                resize: true,
            });

            // Ensure we only have one region active for simplicity
            wsRegions.on('region-created', (region: any) => {
                regions.current.getRegions().forEach((r: any) => {
                    if (r.id !== region.id) r.remove();
                });
            });
        }

        return () => {
            wavesurfer.current?.destroy();
        };
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && wavesurfer.current) {
            setLoadedFile(file);
            const url = URL.createObjectURL(file);
            wavesurfer.current.load(url);
        }
    };

    const handlePlayPause = () => {
        wavesurfer.current?.playPause();
    };

    const handleAddRegion = () => {
        if (!wavesurfer.current || !regions.current) return;
        const duration = wavesurfer.current.getDuration();
        regions.current.clearRegions();
        regions.current.addRegion({
            start: duration * 0.25,
            end: duration * 0.75,
            color: 'rgba(6, 182, 212, 0.3)',
            drag: true,
            resize: true
        });
    };

    const handleExtract = async () => {
        if (!wavesurfer.current || !loadedFile) return;

        const region = regions.current.getRegions()[0];
        let start = 0;
        let end = wavesurfer.current.getDuration();

        if (region) {
            start = region.start;
            end = region.end;
        }

        // Decode the original file to get AudioBuffer
        const audioContext = new AudioContext();
        const arrayBuffer = await loadedFile.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Create new buffer for the segment
        const sampleRate = audioBuffer.sampleRate;
        const startFrame = Math.floor(start * sampleRate);
        const endFrame = Math.floor(end * sampleRate);
        const frameCount = endFrame - startFrame;
        const newBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate);

        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const channelData = audioBuffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            for (let j = 0; j < frameCount; j++) {
                newChannelData[j] = channelData[startFrame + j];
            }
        }

        // Convert back to WAV Blob
        const wavBlob = bufferToWav(newBuffer);

        // Save to board
        const board = boards.find(b => b.id === selectedBoardId);
        if (board) {
            const newSound: Sound = {
                id: crypto.randomUUID(),
                name: `Cut - ${loadedFile.name}`,
                source: 'upload',
                blob: wavBlob,
                color: '#10b981',
                volume: 1,
                loop: false,
                shortcut: ''
            };
            const updatedBoard = { ...board, sounds: [...board.sounds, newSound] };
            await saveBoard(updatedBoard);
            alert('Sound added to board!');
            navigate('/');
        }
    };

    // Helper to convert AudioBuffer to WAV Blob (simplified version)
    const bufferToWav = (buffer: AudioBuffer) => {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArr = new ArrayBuffer(length);
        const view = new DataView(bufferArr);
        const channels = [];
        let i;
        let sample;
        let offset = 0;
        let pos = 0;

        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(buffer.sampleRate);
        setUint32(buffer.sampleRate * 2 * numOfChan);  // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit (hardcoded in this example)

        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length

        // write interleaved data
        for (i = 0; i < buffer.numberOfChannels; i++)
            channels.push(buffer.getChannelData(i));

        while (pos < buffer.length) {
            for (i = 0; i < numOfChan; i++) {             // interleave channels
                sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
                view.setInt16(44 + offset, sample, true);          // write 16-bit sample
                offset += 2;
            }
            pos++;
        }

        return new Blob([bufferArr], { type: "audio/wav" });

        function setUint16(data: any) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data: any) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-200 p-8 flex flex-col">
            <header className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Audio Editor</h1>
                </div>
            </header>

            <div className="flex-1 flex flex-col gap-6">
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
                    <div ref={waveformRef} className="w-full" />
                </div>

                <div className="flex items-center justify-between bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors">
                            <Upload className="w-5 h-5" />
                            <span>Load Audio</span>
                            <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
                        </label>

                        <button
                            onClick={handlePlayPause}
                            disabled={!loadedFile}
                            className="p-3 bg-primary-600 rounded-full hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
                        </button>

                        <button
                            onClick={handleAddRegion}
                            disabled={!loadedFile}
                            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 border border-gray-700 transition-colors"
                        >
                            Select Region
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={selectedBoardId}
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-primary-500"
                        >
                            {boards.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        <button
                            onClick={handleExtract}
                            disabled={!loadedFile}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-600 rounded-lg hover:bg-accent-500 disabled:opacity-50 transition-colors text-white font-medium"
                        >
                            <Scissors className="w-4 h-4" />
                            <span>Cut & Add to Board</span>
                        </button>
                    </div>
                </div>

                <div className="text-center text-gray-500 text-sm">
                    <p>Drag on the waveform to select a region to cut.</p>
                </div>
            </div>
        </div>
    );
};

export default AudioEditor;
