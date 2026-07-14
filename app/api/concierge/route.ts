import { GoogleGenAI, Type } from "@google/genai";

const CONCIERGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    search_query: { type: Type.STRING },
    filter_noise: { type: Type.STRING, enum: ["quiet", "moderate", "loud", "unspecified"] },
    filter_wifi: { type: Type.STRING, enum: ["yes", "no", "unspecified"] },
    filter_studying: { type: Type.STRING, enum: ["yes", "no", "unspecified"] },
    explanation: { type: Type.STRING },
  },
  required: [
    "search_query", "filter_noise", "filter_wifi", "filter_studying", "explanation",
  ],
};

export async function POST(request: Request) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  const body = await request.json();
  const userMessage: string = body.message || "";

  if (!userMessage.trim()) {
    return Response.json({ error: "Missing message" }, { status: 400 });
  }

  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You help translate a user's natural-language request for a cafe into a search query and optional filters for a cafe-finder app.

Given the user's message, produce:
- search_query: a short, effective search phrase to look up cafes (e.g. "quiet cafe with good wifi for video calls")
- filter_noise: "quiet", "moderate", "loud", or "unspecified" if not clearly implied
- filter_wifi: "yes", "no", or "unspecified" if not clearly implied
- filter_studying: "yes", "no", or "unspecified" if not clearly implied
- explanation: a short, friendly one-sentence explanation of what you're searching for, written to the user directly (e.g. "Looking for quiet, wifi-friendly spots for your call.")

Only set a filter value if the request clearly implies it -- use "unspecified" otherwise, don't guess.


User's message: "${userMessage}"`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: CONCIERGE_SCHEMA,
    },
  });

  const result = JSON.parse(response.text || "{}");
  return Response.json(result);
}