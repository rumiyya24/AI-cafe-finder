import { GoogleGenAI, Type } from "@google/genai";

type Review = {
  text?: { text: string };
};

const VIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    noise_level: {
      type: Type.STRING,
      enum: ["quiet", "moderate", "loud", "unknown"],
    },
    noise_evidence: { type: Type.STRING },
    wifi: {
      type: Type.STRING,
      enum: ["yes", "no", "unknown"],
    },
    wifi_evidence: { type: Type.STRING },
    outlets: {
      type: Type.STRING,
      enum: ["yes", "no", "unknown"],
    },
    outlets_evidence: { type: Type.STRING },
    good_for_studying: {
      type: Type.STRING,
      enum: ["yes", "no", "unknown"],
    },
    studying_evidence: { type: Type.STRING },
  },
  required: [
    "noise_level",
    "noise_evidence",
    "wifi",
    "wifi_evidence",
    "outlets",
    "outlets_evidence",
    "good_for_studying",
    "studying_evidence",
  ],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!geminiKey || !placesKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY or GOOGLE_PLACES_API_KEY" },
      { status: 500 }
    );
  }

  const { placeId } = await params;

  // Fetch reviews for this place
  const placeResponse = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask": "reviews",
      },
    }
  );

  if (!placeResponse.ok) {
    const errorBody = await placeResponse.text();
    return Response.json(
      { error: "Failed to fetch place reviews", details: errorBody },
      { status: placeResponse.status }
    );
  }

  const placeData = await placeResponse.json();
  const reviews: Review[] = placeData.reviews || [];

  if (reviews.length === 0) {
    return Response.json({
      noise_level: "unknown",
      noise_evidence: "No reviews available",
      wifi: "unknown",
      wifi_evidence: "No reviews available",
      outlets: "unknown",
      outlets_evidence: "No reviews available",
      good_for_studying: "unknown",
      studying_evidence: "No reviews available",
    });
  }

  const reviewText = reviews
    .map((r, i) => `Review ${i + 1}: ${r.text?.text || ""}`)
    .join("\n\n");

  const ai = new GoogleGenAI({ apiKey: geminiKey });

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are analyzing real customer reviews of a cafe to extract specific factual attributes. Only state something if the reviews actually support it -- do not guess or infer beyond what is written. If the reviews don't mention something, mark it "unknown", even if you think it's likely true.

For each attribute, also provide a short quote or close paraphrase from the actual review text as evidence. If unknown, say "Not mentioned in reviews" as the evidence.

Reviews:
${reviewText}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: VIBE_SCHEMA,
    },
  });

  const vibeData = JSON.parse(response.text || "{}");
  return Response.json(vibeData);
}