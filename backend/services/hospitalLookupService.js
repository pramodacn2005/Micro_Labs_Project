import axios from "axios";

const GOOGLE_PLACES_KEY = process.env.GOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
}

async function googlePlacesSearch({ lat, lon }) {
  const url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
  const { data } = await axios.get(url, {
    params: {
      keyword: "hospital",
      location: `${lat},${lon}`,
      radius: 15000,
      key: GOOGLE_PLACES_KEY,
    },
  });
  if (!data?.results) return [];
  return data.results.slice(0, 3).map((place) => {
    const distance = place.geometry
      ? haversineDistance(lat, lon, place.geometry.location.lat, place.geometry.location.lng)
      : null;
    return {
      name: place.name,
      address: place.vicinity || place.formatted_address || "Address not available",
      lat: place.geometry?.location?.lat || null,
      lon: place.geometry?.location?.lng || null,
      phone: place.formatted_phone_number || place.international_phone_number || null,
      distance_km: distance,
      map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
    };
  });
}

async function nominatimSearch({ lat, lon, city }) {
  try {
    const params = {
      format: "json",
      addressdetails: 1,
      limit: 5,
    };

    // Build query based on available information
    if (city) {
      params.q = `hospital ${city}`;
    } else if (lat && lon) {
      // Use reverse geocoding to get city first, then search hospitals
      params.q = "hospital";
      params.lat = lat;
      params.lon = lon;
    } else {
      params.q = "hospital";
    }

    const { data } = await axios.get(NOMINATIM_URL, {
      params,
      headers: {
        "User-Agent": "FeverSymptomsChecker/1.0 (contact: support@example.com)",
        "Accept-Language": "en",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Filter for hospitals and medical facilities
    const hospitals = data
      .filter((entry) => {
        const type = entry.type?.toLowerCase() || "";
        const category = entry.category?.toLowerCase() || "";
        const name = (entry.display_name || "").toLowerCase();
        return (
          type.includes("hospital") ||
          category.includes("hospital") ||
          name.includes("hospital") ||
          name.includes("medical") ||
          name.includes("clinic") ||
          name.includes("health")
        );
      })
      .slice(0, 3);

    return hospitals.map((entry) => {
      const entryLat = Number(entry.lat);
      const entryLon = Number(entry.lon);
      const distance = lat && lon ? haversineDistance(lat, lon, entryLat, entryLon) : null;
      
      // Extract hospital name (usually first part of display_name)
      const nameParts = entry.display_name?.split(",") || [];
      const name = nameParts[0] || "Hospital";
      
      // Build address from display_name parts
      const address = nameParts.slice(0, 4).join(", ");

      // Build Google Maps link
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.display_name || name)}`;

      return {
        name: name.trim(),
        address: address.trim(),
        lat: entryLat,
        lon: entryLon,
        phone: entry?.extratags?.phone || entry?.extratags?.contact || entry?.extratags?.["contact:phone"] || null,
        distance_km: distance ? parseFloat(distance.toFixed(2)) : null,
        map_url: googleMapsUrl,
      };
    });
  } catch (error) {
    console.error("[HospitalLookup] Nominatim search error:", error.message);
    return [];
  }
}

export async function lookupHospitals(location = {}) {
  if (!location || (!location.lat && !location.lon && !location.city)) {
    return [];
  }
  
  const { lat, lon, city } = location;
  
  try {
    // Try Google Places first if API key is available and coordinates exist
    if (GOOGLE_PLACES_KEY && lat && lon) {
      const googleResults = await googlePlacesSearch({ lat, lon });
      if (googleResults && googleResults.length > 0) {
        return googleResults;
      }
    }
    
    // Fallback to Nominatim (OpenStreetMap)
    return await nominatimSearch({ lat, lon, city });
  } catch (error) {
    console.warn("[HospitalLookup] Failed to query hospital API", error.message);
    return [];
  }
}


