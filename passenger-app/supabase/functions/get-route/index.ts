// Supabase Edge Function: get-route
// Calls Google Routes API to get real driving distance, duration, and polyline.
// Keeps the Google API key server-side (stored as Supabase secret).

import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } =
      await req.json();

    // Validate inputs
    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng) {
      return new Response(
        JSON.stringify({ error: "Missing pickup or dropoff coordinates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      console.error("GOOGLE_MAPS_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Route service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Routes API (computeRoutes)
    // Docs: https://developers.google.com/maps/documentation/routes/compute_route_matrix
    const routesResponse = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          // Request only the fields we need to minimize billing
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: pickup_lat, longitude: pickup_lng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: dropoff_lat, longitude: dropoff_lng },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: false,
          languageCode: "no", // Norwegian for street names
          units: "METRIC",
        }),
      }
    );

    if (!routesResponse.ok) {
      const errText = await routesResponse.text();
      console.error("Google Routes API error:", routesResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Route calculation failed", detail: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const routesData = await routesResponse.json();

    if (!routesData.routes || routesData.routes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No route found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = routesData.routes[0];

    // duration comes as "123s" string — parse to seconds
    const durationSeconds = parseInt(route.duration?.replace("s", "") || "0", 10);
    const distanceMeters = route.distanceMeters || 0;

    const result = {
      distance_km: Math.round((distanceMeters / 1000) * 100) / 100,
      duration_min: Math.round((durationSeconds / 60) * 10) / 10,
      polyline: route.polyline?.encodedPolyline || null,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-route error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
