export async function GET(
  request: Request,
  { params }: { params: Promise<{ placeId: string }> }
) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GOOGLE_PLACES_API_KEY is not set" },
      { status: 500 }
    );
  }

  const { placeId } = await params;

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,reviews,editorialSummary,generativeSummary",
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return Response.json(
      { error: "Google Place Details request failed", details: errorBody },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
}