exports.handler = async function handler() {
    const apiKey = process.env.GOOGLE_API_KEY;
    const placeId = "ChIJ69-5-08RrjsR656yW4p3P2M";

    if (!apiKey) {
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "GOOGLE_API_KEY is not configured" })
        };
    }

try {
    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: "GET",
        headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "displayName,currentOpeningHours,regularOpeningHours"
        }
    });
    
    const data = await response.json();

    if (!response.ok) {
        return {
            statusCode: 502,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                error: "Google Places request failed",
                googleStatus: data.error?.status || `HTTP_${response.status}`,
                details: data.error?.message || "Google returned no additional details"
            })
        };
    }

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300"
        },
        body: JSON.stringify({
            openNow: data.currentOpeningHours?.openNow ?? false
        })
    };
} catch (error) {
    return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            error: "Opening-hours service failed",
            details: error instanceof Error ? error.message : String(error)
        })
    };
}

