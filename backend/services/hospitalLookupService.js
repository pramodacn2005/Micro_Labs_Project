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
    // Try multiple query formats for better results
    const queryFormats = [];
    
    if (city) {
      // Try different query formats for city search
      queryFormats.push(`${city}, India hospital`);
      queryFormats.push(`hospital ${city}`);
      queryFormats.push(`${city} hospital`);
      queryFormats.push(`hospital in ${city}, India`);
    } else if (lat && lon) {
      // Use reverse geocoding to get city first, then search hospitals
      queryFormats.push("hospital");
    } else {
      queryFormats.push("hospital");
    }

    let allResults = [];
    
    // Try each query format until we get results
    for (const queryStr of queryFormats) {
      try {
        const params = {
          q: queryStr,
          format: "json",
          addressdetails: 1,
          limit: 20, // Get more results to filter from
        };
        
        if (lat && lon && !city) {
          params.lat = lat;
          params.lon = lon;
        }

        console.log(`[HospitalLookup] Trying Nominatim query: "${queryStr}"`);
        
        const { data } = await axios.get(NOMINATIM_URL, {
          params,
          headers: {
            "User-Agent": "FeverSymptomsChecker/1.0 (contact: support@example.com)",
            "Accept-Language": "en",
          },
          timeout: 10000, // 10 second timeout
        });

        if (data && Array.isArray(data) && data.length > 0) {
          allResults = data;
          console.log(`[HospitalLookup] Found ${data.length} results with query: "${queryStr}"`);
          break; // Use first successful query
        }
      } catch (queryError) {
        console.warn(`[HospitalLookup] Query "${queryStr}" failed:`, queryError.message);
        continue; // Try next query format
      }
    }

    if (!allResults || allResults.length === 0) {
      console.log("[HospitalLookup] No results from Nominatim for any query format");
      return [];
    }

    // Filter for hospitals and medical facilities (very lenient filtering)
    // Since Nominatim already filtered by our "hospital" query, we trust most results
    const hospitals = allResults
      .filter((entry, index) => {
        const type = (entry.type || "").toLowerCase();
        const category = (entry.category || "").toLowerCase();
        const classType = (entry.class || "").toLowerCase();
        const name = (entry.display_name || entry.name || "").toLowerCase();
        
        // Exclude obvious non-medical places
        const isExcluded = (
          name.includes("hotel") ||
          name.includes("restaurant") ||
          name.includes("school") ||
          name.includes("university") ||
          name.includes("hospitality") || // Hotels
          type.includes("school") ||
          type.includes("restaurant") ||
          type.includes("hotel") ||
          type.includes("cafe")
        );
        
        if (isExcluded) {
          return false;
        }
        
        // Very lenient - include if it matches any medical-related term
        // OR if it's in the top results (Nominatim ranks by relevance)
        const isMedical = (
          type.includes("hospital") ||
          type.includes("clinic") ||
          type.includes("medical") ||
          type.includes("pharmacy") ||
          category.includes("hospital") ||
          category.includes("medical") ||
          category.includes("healthcare") ||
          category.includes("health") ||
          name.includes("hospital") ||
          name.includes("medical") ||
          name.includes("clinic") ||
          name.includes("health") ||
          name.includes("care") ||
          name.includes("healthcare") ||
          name.includes("doctor") ||
          name.includes("physician") ||
          name.includes("nursing") ||
          name.includes("diagnostic")
        );
        
        // If it's in top 10 results and not excluded, include it (trust Nominatim ranking)
        if (index < 10 && !isExcluded) {
          return true;
        }
        
        return isMedical;
      })
      .slice(0, 5); // Return top 5
    
    // If filtering removed all results, return first few results anyway (trust Nominatim)
    if (hospitals.length === 0 && allResults.length > 0) {
      console.log("[HospitalLookup] Filtering removed all results, returning top results anyway");
      return allResults.slice(0, 5).map((entry) => {
        const entryLat = Number(entry.lat);
        const entryLon = Number(entry.lon);
        const distance = lat && lon ? haversineDistance(lat, lon, entryLat, entryLon) : null;
        
        const nameParts = entry.display_name?.split(",") || [];
        const name = nameParts[0] || entry.name || "Hospital";
        const address = nameParts.slice(0, 4).join(", ");

        return {
          name: name.trim(),
          address: address.trim(),
          lat: entryLat,
          lon: entryLon,
          phone: entry?.extratags?.phone || entry?.extratags?.contact || entry?.extratags?.["contact:phone"] || null,
          distance_km: distance ? parseFloat(distance.toFixed(2)) : null,
          map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.display_name || name)}`,
        };
      });
    }

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
    console.log("[HospitalLookup] No location provided:", location);
    return [];
  }
  
  const { lat, lon, city } = location;
  console.log("[HospitalLookup] Searching hospitals for:", { lat, lon, city });
  
  try {
    // Try Google Places first if API key is available and coordinates exist
    if (GOOGLE_PLACES_KEY && lat && lon) {
      console.log("[HospitalLookup] Using Google Places API");
      const googleResults = await googlePlacesSearch({ lat, lon });
      if (googleResults && googleResults.length > 0) {
        console.log(`[HospitalLookup] Found ${googleResults.length} hospitals via Google Places`);
        return googleResults;
      }
      console.log("[HospitalLookup] No results from Google Places, falling back to Nominatim");
    }
    
    // Fallback to Nominatim (OpenStreetMap)
    console.log("[HospitalLookup] Using Nominatim (OpenStreetMap)");
    const nominatimResults = await nominatimSearch({ lat, lon, city });
    console.log(`[HospitalLookup] Found ${nominatimResults.length} hospitals via Nominatim`);
    return nominatimResults;
  } catch (error) {
    console.error("[HospitalLookup] Failed to query hospital API:", error.message);
    console.error("[HospitalLookup] Error stack:", error.stack);
    return [];
  }
}


