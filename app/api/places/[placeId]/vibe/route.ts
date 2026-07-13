import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/lib/supabase";

type Review = {
  text?: { text: string };
};

const VIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    noise_level: { type: Type.STRING, enum: ["quiet", "moderate", "loud", "unknown"] },
    noise_evidence: { type: Type.STRING },
    wifi: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    wifi_evidence: { type: Type.STRING },
    outlets: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    outlets_evidence: { type: Type.STRING },
    good_for_studying: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    studying_evidence: { type: Type.STRING },
    data_source: { type: Type.STRING, enum: ["reviews", "ai_estimate"] },
  },
  required: [
    "noise_level", "noise_evidence", "wifi", "wifi_evidence",
    "outlets", "outlets_evidence", "good_for_studying", "studying_evidence",
    "data_source",
  ],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const { placeId } = await params;

  const { data: cached } = await supabase
    .from("vibe_checks")
    .select("*")
    .eq("place_id", placeId)
    .single();

  if (cached) {
    return Response.json({
      noise_level: cached.noise_level,
      noise_evidence: cached.noise_evidence,
      wifi: cached.wifi,
      wifi_evidence: cached.wifi_evidence,
      outlets: cached.outlets,
      outlets_evidence: cached.outlets_evidence,
      good_for_studying: cached.good_for_studying,
      studying_evidence: cached.studying_evidence,
      data_source: cached.data_source || "reviews",
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const placesKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!geminiKey || !placesKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY or GOOGLE_PLACES_API_KEY" },
      { status: 500 }
    );
  }

  const placeResponse = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      headers: {
        "X-Goog-Api-Key": placesKey,
        "X-Goog-FieldMask":
          "reviews,editorialSummary,generativeSummary,displayName,formattedAddress,primaryType",
      },
    }
  );

  if (!placeResponse.ok) {
    const errorBody = await placeResponse.text();
    return Response.json(
      { error: "Failed to fetch place details", details: errorBody },
      { status: placeResponse.status }
    );
  }

  const placeData = await placeResponse.json();
  const reviews: Review[] = placeData.reviews || [];

  const textSources: string[] = [];

  if (reviews.length > 0) {
    textSources.push(
      reviews.map((r, i) => `Review ${i + 1}: ${r.text?.text || ""}`).join("\n\n")
    );
  }

  const editorialSummary = placeData.editorialSummary?.text;
  if (editorialSummary) {
    textSources.push(`Editorial summary: ${editorialSummary}`);
  }

  const generativeSummary = placeData.generativeSummary?.overview?.text;
  if (generativeSummary) {
    textSources.push(`AI-generated summary: ${generativeSummary}`);
  }

  const ai = new GoogleGenAI({ apiKey: geminiKey });
  let vibeResult;

  if (textSources.length > 0) {
    // Path A: real reviews/summaries exist -- extract with evidence
    const reviewText = textSources.join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are analyzing real customer reviews of a cafe to extract specific factual attributes. Only state something if the reviews actually support it -- do not guess or infer beyond what is written. If the reviews don't mention something, mark it "unknown", even if you think it's likely true.

For each attribute, also provide a short quote or close paraphrase from the actual review text as evidence. If unknown, say "Not mentioned in reviews" as the evidence.

Set data_source to "reviews".

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

    vibeResult = JSON.parse(response.text || "{}");
  } else {
    // Path B: no reviews or summaries -- ask for a general, honestly-labeled estimate
    const cafeName = placeData.displayName?.text || "this cafe";
    const address = placeData.formattedAddress || "an unknown location";

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You have no reviews or descriptions available for this cafe. Based only on general knowledge of what cafes of this type are typically like, and the name/location given, provide your best reasonable general estimate for each attribute -- but only if you can genuinely justify a typical pattern. If you have no reasonable basis to guess even generally, use "unknown" rather than making something up.

For each evidence field, explain briefly what general reasoning led to your estimate (e.g. "chain coffee shops of this type typically offer wifi"), or say "No basis for even a general estimate" if marked unknown.

Set data_source to "ai_estimate".

Cafe name: ${cafeName}
Address: ${address}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: VIBE_SCHEMA,
      },
    });

    vibeResult = JSON.parse(response.text || "{}");
  }

  await supabase.from("vibe_checks").upsert({
    place_id: placeId,
    ...vibeResult,
    checked_at: new Date().toISOString(),
  });

  return Response.json(vibeResult);
}