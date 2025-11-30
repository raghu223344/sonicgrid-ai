// import { GoogleGenAI, Modality } from "@google/genai"; // Removed: logic moved to backend

// Audio processing helpers
const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

// Main TTS function
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<Blob | null> => {
    try {
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, voice: voiceName }),
        });

        if (!response.ok) {
            const errorData = await response.json() as { error?: string };
            throw new Error(errorData.error || 'TTS generation failed');
        }

        const data = await response.json() as { audio: string };
        const base64Audio = data.audio;

        if (!base64Audio) {
            throw new Error("No audio data returned");
        }

        const pcmData = decode(base64Audio);
        return pcmToWav(pcmData, 24000);

    } catch (error) {
        console.error("Gemini TTS Error:", error);
        throw error;
    }
};

// Helper to wrap raw PCM in WAV container
const pcmToWav = (pcmData: Uint8Array, sampleRate: number): Blob => {
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);

    // Convert raw PCM bytes (which might be BigEndian from network? No, usually Little Endian or just raw bytes.
    // The Gemini output is raw PCM. We need to assume 16-bit depth.
    // The decode helper returns Uint8Array. 
    // We just concatenate header + data.

    const wavBlob = new Blob([view, pcmData as any], { type: 'audio/wav' });
    return wavBlob;
};
