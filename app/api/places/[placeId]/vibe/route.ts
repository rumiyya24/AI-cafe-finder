import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/lib/supabase";

type Review = {
  text?: { text: string };
  googleMapsUri?: string;
};

const VIBE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    noise_level: { type: Type.STRING, enum: ["quiet", "moderate", "loud", "unknown"] },
    noise_evidence: { type: Type.STRING },
    noise_review_index: { type: Type.INTEGER },
    wifi: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    wifi_evidence: { type: Type.STRING },
    wifi_review_index: { type: Type.INTEGER },
    outlets: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    outlets_evidence: { type: Type.STRING },
    outlets_review_index: { type: Type.INTEGER },
    good_for_studying: { type: Type.STRING, enum: ["yes", "no", "unknown"] },
    studying_evidence: { type: Type.STRING },
    studying_review_index: { type: Type.INTEGER },
    data_source: { type: Type.STRING, enum: ["reviews", "ai_estimate"] },
  },
  required: [
    "noise_level", "noise_evidence", "noise_review_index",
    "wifi", "wifi_evidence", "wifi_review_index",
    "outlets", "outlets_evidence", "outlets_review_index",
    "good_for_studying", "studying_evidence", "studying_review_index",
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
      noise_review_index: cached.noise_review_index ?? -1,
      wifi: cached.wifi,
      wifi_evidence: cached.wifi_evidence,
      wifi_review_index: cached.wifi_review_index ?? -1,
      outlets: cached.outlets,
      outlets_evidence: cached.outlets_evidence,
      outlets_review_index: cached.outlets_review_index ?? -1,
      good_for_studying: cached.good_for_studying,
      studying_evidence: cached.studying_evidence,
      studying_review_index: cached.studying_review_index ?? -1,
      data_source: cached.data_source || "reviews",
      review_urls: cached.review_urls || [],
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
  const reviewUrls: (string | null)[] = reviews.map((r) => r.googleMapsUri || null);

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
    const reviewText = textSources.join("\n\n");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are analyzing real customer reviews of a cafe to extract specific factual attributes. Only state something if the reviews actually support it -- do not guess or infer beyond what is written. If the reviews don't mention something, mark it "unknown", even if you think it's likely true.

For each attribute, provide a short quote or close paraphrase from the actual review text as evidence. If unknown, say "Not mentioned in reviews" as the evidence.

Reviews are numbered (Review 1, Review 2, etc). For each attribute, also report which review number the evidence primarily came from, as an integer in the corresponding _review_index field (e.g. if evidence came from Review 2, set that field to 2). If the evidence came from the editorial or AI-generated summary text rather than a specific numbered review, or if the attribute is "unknown", set the review index to -1.

Set data_source to "reviews".

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

    // Defensive: clamp any out-of-range indices to -1 rather than trust
    // the model blindly, since a broken link is worse than no link
    const clampIndex = (idx: number) =>
      idx >= 1 && idx <= reviews.length ? idx : -1;
    vibeResult.noise_review_index = clampIndex(vibeResult.noise_review_index);
    vibeResult.wifi_review_index = clampIndex(vibeResult.wifi_review_index);
    vibeResult.outlets_review_index = clampIndex(vibeResult.outlets_review_index);
    vibeResult.studying_review_index = clampIndex(vibeResult.studying_review_index);
  } else {
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

For each evidence field, explain briefly what general reasoning led to your estimate, or say "No basis for even a general estimate" if marked unknown. Set every _review_index field to -1, since there are no reviews to reference.

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

    // No reviews exist at all in this path -- force indices to -1
    // regardless of what the model returned, since nothing to link to
    vibeResult.noise_review_index = -1;
    vibeResult.wifi_review_index = -1;
    vibeResult.outlets_review_index = -1;
    vibeResult.studying_review_index = -1;
  }

  await supabase.from("vibe_checks").upsert({
    place_id: placeId,
    ...vibeResult,
    review_urls: reviewUrls,
    checked_at: new Date().toISOString(),
  });

  return Response.json({ ...vibeResult, review_urls: reviewUrls });
}