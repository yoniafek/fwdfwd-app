/**
 * Calculate the distance between two points using the Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 * Returns "Short walk" for < 0.3 miles, otherwise "~X mi"
 */
export function formatDistance(miles) {
  if (miles === null || miles === undefined) return null;
  
  if (miles < 0.3) {
    return 'Short walk';
  }
  
  if (miles < 1) {
    return `~${miles.toFixed(1)} mi`;
  }
  
  return `~${Math.round(miles)} mi`;
}

/**
 * Generate Google Maps directions URL
 */
export function getDirectionsUrl(originLat, originLng, destLat, destLng, originName, destName) {
  // If we have coordinates, use them for precision
  if (originLat && originLng && destLat && destLng) {
    return `https://www.google.com/maps/dir/${originLat},${originLng}/${destLat},${destLng}`;
  }
  
  // Fallback to place names
  const origin = encodeURIComponent(originName || '');
  const dest = encodeURIComponent(destName || '');
  return `https://www.google.com/maps/dir/${origin}/${dest}`;
}

/**
 * Generate Google Maps location URL
 * Uses search query with name + address for better accuracy
 */
export function getLocationUrl(lat, lng, placeName, address) {
  // Prefer search by name + address for known businesses
  if (placeName && address && placeName !== address) {
    const searchQuery = `${placeName}, ${address}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchQuery)}`;
  }
  
  // If we only have address, search by that
  if (address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  
  // If we only have name, search by that
  if (placeName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
  }
  
  // Last resort: coordinates (but this gives poor results)
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  
  return null;
}

