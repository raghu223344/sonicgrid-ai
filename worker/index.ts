import { GoogleGenAI, Modality } from "@google/genai";

interface Env {
	GEMINI_API_KEY: string;
	ASSETS: Fetcher;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		if (url.pathname === "/api/tts" && request.method === "POST") {
			try {
				const { text, voice } = await request.json() as { text: string; voice: string };

				if (!env.GEMINI_API_KEY) {
					return new Response("API Key not configured", { status: 500 });
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
					return new Response("No audio data returned", { status: 500 });
				}

				// Return the base64 audio directly, or decode it. 
				// The frontend expects a blob or something to play. 
				// Let's return JSON with base64 to keep it simple and consistent with the previous logic, 
				// or return the binary data. 
				// The previous frontend logic decoded base64. 
				// Let's return JSON for now to match the "API" feel.
				return new Response(JSON.stringify({ audio: base64Audio }), {
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					},
				});

			} catch (error) {
				console.error("Worker Error:", error);
				return new Response(JSON.stringify({ error: String(error) }), {
					status: 500,
					headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
				});
			}
		}

		// Serve static assets for all other routes
		return env.ASSETS.fetch(request);
	},
};
