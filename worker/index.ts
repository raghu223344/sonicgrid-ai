import { GoogleGenAI, Modality } from "@google/genai";

interface Env {
	GEMINI_API_KEY: string;
	ASSETS: Fetcher;
	funsounds_db: D1Database;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Content-Type": "application/json",
		};

		try {
			// API: Get all boards
			if (url.pathname === "/api/boards" && request.method === "GET") {
				const { results: boards } = await env.funsounds_db.prepare("SELECT * FROM boards ORDER BY created_at DESC").all();

				// For each board, fetch its sounds
				const boardsWithSounds = await Promise.all(boards.map(async (board: any) => {
					const { results: sounds } = await env.funsounds_db.prepare("SELECT * FROM sounds WHERE board_id = ?").bind(board.id).all();

					const soundsWithData = sounds.map((s: any) => {
						let audioBase64 = null;
						if (s.audio_data) {
							audioBase64 = arrayBufferToBase64(s.audio_data);
						}
						return { ...s, audioData: audioBase64, audio_data: undefined };
					});

					return { ...board, sounds: soundsWithData };
				}));

				return new Response(JSON.stringify(boardsWithSounds), { headers: corsHeaders });
			}

			// API: Save (Create/Update) Board
			if (url.pathname === "/api/boards" && request.method === "POST") {
				const board = await request.json() as any;

				// Upsert Board
				await env.funsounds_db.prepare(`
					INSERT INTO boards (id, name, columns, gap, user_id, created_at) 
					VALUES (?, ?, ?, ?, ?, ?) 
					ON CONFLICT(id) DO UPDATE SET 
					name=excluded.name, columns=excluded.columns, gap=excluded.gap
				`).bind(
					board.id,
					board.name,
					board.columns,
					board.gap,
					board.user_id || 'anon',
					Math.floor(Date.now() / 1000)
				).run();

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			}

			// API: Delete Board
			if (url.pathname.startsWith("/api/boards/") && request.method === "DELETE") {
				const id = url.pathname.split("/").pop();
				if (id) {
					await env.funsounds_db.prepare("DELETE FROM boards WHERE id = ?").bind(id).run();
					return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
				}
			}

			// API: Save Sound
			if (url.pathname === "/api/sounds" && request.method === "POST") {
				const sound = await request.json() as any;

				// Convert base64 back to ArrayBuffer for storage
				let audioData = null;
				if (sound.audioData) {
					audioData = base64ToArrayBuffer(sound.audioData);
				}

				await env.funsounds_db.prepare(`
					INSERT INTO sounds (id, board_id, name, source, audio_data, color, volume, loop, shortcut, created_by, created_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					ON CONFLICT(id) DO UPDATE SET
					name=excluded.name, source=excluded.source, audio_data=excluded.audio_data, 
					color=excluded.color, volume=excluded.volume, loop=excluded.loop, shortcut=excluded.shortcut
				`).bind(
					sound.id,
					sound.board_id,
					sound.name,
					sound.source,
					audioData,
					sound.color,
					sound.volume,
					sound.loop,
					sound.shortcut,
					sound.created_by || 'anon',
					Math.floor(Date.now() / 1000)
				).run();

				return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
			}

			// API: Delete Sound
			if (url.pathname.startsWith("/api/sounds/") && request.method === "DELETE") {
				const id = url.pathname.split("/").pop();
				if (id) {
					await env.funsounds_db.prepare("DELETE FROM sounds WHERE id = ?").bind(id).run();
					return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
				}
			}

			// TTS Endpoint (Existing)
			if (url.pathname === "/api/tts" && request.method === "POST") {
				const { text, voice } = await request.json() as { text: string; voice: string };

				if (!env.GEMINI_API_KEY) {
					return new Response("API Key not configured", { status: 500, headers: corsHeaders });
				}

				const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

				const response = await ai.models.generateContent({
					model: "gemini-2.5-flash-preview-tts",
					contents: [{ parts: [{ text: text }] }],
					config: {
						responseModalities: [Modality.AUDIO],
						speechConfig: {
							voiceConfig: {
								prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
							},
						},
					},
				});

				const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

				if (!base64Audio) {
					return new Response("No audio data returned", { status: 500, headers: corsHeaders });
				}

				return new Response(JSON.stringify({ audio: base64Audio }), {
					headers: corsHeaders,
				});
			}

		} catch (error) {
			console.error("Worker Error:", error);
			return new Response(JSON.stringify({ error: String(error) }), {
				status: 500,
				headers: corsHeaders,
			});
		}

		// Serve static assets for all other routes
		return env.ASSETS.fetch(request);
	},
};

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer | number[]): string {
	if (Array.isArray(buffer)) {
		buffer = new Uint8Array(buffer).buffer;
	}
	let binary = '';
	const bytes = new Uint8Array(buffer as ArrayBuffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary_string = atob(base64);
	const len = binary_string.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes.buffer;
}
