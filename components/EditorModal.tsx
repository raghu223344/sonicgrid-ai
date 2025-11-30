import React, { useState, useRef, useEffect } from 'react';
import { Sound } from '../types';
import { Mic, Upload, Wand2, X, Play, Square, Loader2 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface EditorModalProps {
  sound: Partial<Sound>;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sound: Partial<Sound>) => void;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const EditorModal: React.FC<EditorModalProps> = ({ sound, isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'mic' | 'ai'>('upload');
  const [name, setName] = useState(sound.name || '');
  const [volume, setVolume] = useState(sound.volume || 1.0);
  const [loop, setLoop] = useState(sound.loop || false);
  const [color, setColor] = useState(sound.color || COLORS[4]);
  const [blob, setBlob] = useState<Blob | undefined>(sound.blob);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiVoice, setAiVoice] = useState('Kore');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(sound.name || '');
      setVolume(sound.volume || 1.0);
      setLoop(sound.loop || false);
      setColor(sound.color || COLORS[4]);
      setBlob(sound.blob);
      setAiPrompt('');
      setAiError(null);
    }
  }, [isOpen, sound]);

  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [blob]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBlob(file);
      if (!name) setName(file.name.split('.')[0]);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setBlob(audioBlob);
          if (!name) setName(`Recording ${new Date().toLocaleTimeString()}`);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic Error:", err);
        alert("Could not access microphone.");
      }
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);
    try {
      const generatedBlob = await generateSpeech(aiPrompt, aiVoice);
      if (generatedBlob) {
        setBlob(generatedBlob);
        if (!name) setName(aiPrompt.substring(0, 15) + (aiPrompt.length > 15 ? '...' : ''));
      }
    } catch (err) {
      setAiError("Failed to generate speech. Check API Key.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!blob && !sound.blob) return; // Must have audio
    onSave({
      ...sound,
      name: name || 'Untitled',
      volume,
      loop,
      color,
      blob: blob || sound.blob,
      source: activeTab
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-800/50">
          <h2 className="text-xl font-bold text-white">Button Editor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Source Tabs */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-950 rounded-lg">
            {[
              { id: 'upload', icon: Upload, label: 'Upload' },
              { id: 'mic', icon: Mic, label: 'Record' },
              { id: 'ai', icon: Wand2, label: 'Gemini AI' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors
                  ${activeTab === tab.id ? 'bg-gray-800 text-primary-500 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Dynamic Content based on Tab */}
          <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 min-h-[160px] flex flex-col justify-center">
            
            {activeTab === 'upload' && (
              <div className="text-center">
                 <label className="cursor-pointer flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-500/5 transition-all group">
                    <Upload className="w-8 h-8 text-gray-400 group-hover:text-primary-500" />
                    <span className="text-sm text-gray-400 group-hover:text-primary-400">Click to select audio file</span>
                    <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
                 </label>
              </div>
            )}

            {activeTab === 'mic' && (
              <div className="flex flex-col items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 animate-pulse' : 'bg-gray-700'}`}>
                  <Mic className={`w-8 h-8 ${isRecording ? 'text-red-500' : 'text-gray-400'}`} />
                </div>
                <button 
                  onClick={toggleRecording}
                  className={`px-6 py-2 rounded-full font-bold transition-colors ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="What should the voice say? (e.g., 'System failure imminent')"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-primary-500 outline-none resize-none h-24"
                />
                <div className="flex gap-2">
                  <select 
                    value={aiVoice}
                    onChange={(e) => setAiVoice(e.target.value)}
                    className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-primary-500 outline-none flex-1"
                  >
                    {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <button 
                    onClick={handleGenerateAI}
                    disabled={isGenerating || !aiPrompt}
                    className="bg-accent-600 hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Generate
                  </button>
                </div>
                {aiError && <p className="text-xs text-red-400 text-center">{aiError}</p>}
              </div>
            )}
            
            {/* Audio Preview Player */}
            {previewUrl && (
               <div className="mt-4 pt-4 border-t border-gray-700 flex items-center gap-3">
                 <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Preview</span>
                 <audio controls src={previewUrl} className="h-8 w-full opacity-80" />
               </div>
            )}
          </div>

          {/* General Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Label Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:border-primary-500 outline-none"
                placeholder="Effect Name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Volume: {Math.round(volume * 100)}%</label>
                  <input 
                    type="range" min="0" max="1" step="0.05" 
                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full accent-primary-500"
                  />
               </div>
               <div className="flex items-center gap-3 mt-4">
                  <label className="text-sm text-gray-300 font-medium">Loop</label>
                  <div 
                    onClick={() => setLoop(!loop)}
                    className={`w-10 h-6 rounded-full p-1 cursor-pointer transition-colors ${loop ? 'bg-primary-600' : 'bg-gray-700'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${loop ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
               </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Color Code</label>
              <div className="flex flex-wrap gap-3">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 border-2 ${color === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white font-medium">Cancel</button>
          <button 
            onClick={handleSave}
            disabled={!blob}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow-lg shadow-primary-500/20"
          >
            Save Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorModal;
