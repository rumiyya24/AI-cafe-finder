export async function GET(request: Request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "GOOGLE_PLACES_API_KEY is not set" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return Response.json(
      { error: "Missing search query (expected ?q=...)" },
      { status: 400 }
    );
  }

  // TODO: hardcoded to Baku for now -- replace with user's actual
  // location or a location picker once the UI supports it
  const BAKU_LAT = 40.4093;
  const BAKU_LNG = 49.8671;
  const SEARCH_RADIUS_METERS = 15000; // 15km, covers greater Baku

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: BAKU_LAT,
              longitude: BAKU_LNG,
            },
            radius: SEARCH_RADIUS_METERS,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return Response.json(
      { error: "Google Places API request failed", details: errorBody },
      { status: response.status }
    );
  }

  const data = await response.json();
  return Response.json(data);
}