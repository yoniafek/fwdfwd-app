import { getSupabase } from './supabase';

// Fetch all trips for the current user
export async function fetchTrips() {
  const { data, error } = await getSupabase()
    .from('trips')
    .select(`
      *,
      travel_steps (*)
    `)
    .order('start_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Fetch a single trip by ID
export async function fetchTrip(tripId) {
  const { data, error } = await getSupabase()
    .from('trips')
    .select(`
      *,
      travel_steps (*)
    `)
    .eq('id', tripId)
    .single();
  
  if (error) throw error;
  return data;
}

// Fetch a trip by share token (for public/shared views)
export async function fetchTripByShareToken(shareToken) {
  const { data, error } = await getSupabase()
    .from('trips')
    .select(`
      *,
      travel_steps (*)
    `)
    .eq('share_token', shareToken)
    .single();
  
  if (error) throw error;
  return data;
}

// Create a new trip
export async function createTrip(userId, trip) {
  const { data, error } = await getSupabase()
    .from('trips')
    .insert([{ 
      ...trip, 
      user_id: userId,
      share_token: generateShareToken()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update an existing trip
export async function updateTrip(tripId, updates) {
  const { data, error } = await getSupabase()
    .from('trips')
    .update(updates)
    .eq('id', tripId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update trip name based on its current steps (auto-naming)
export async function updateTripNameFromSteps(tripId) {
  // Fetch all steps for this trip
  const { data: steps, error: stepsError } = await getSupabase()
    .from('travel_steps')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_datetime', { ascending: true });
  
  if (stepsError) throw stepsError;
  if (!steps || steps.length === 0) return null;
  
  // Generate new name based on steps
  const newName = generateTripName(steps);
  
  // Calculate new date range
  const startDate = steps[0].start_datetime?.split('T')[0];
  const lastStep = steps[steps.length - 1];
  const endDate = (lastStep.end_datetime || lastStep.start_datetime)?.split('T')[0];
  
  // Update the trip
  const { data, error } = await getSupabase()
    .from('trips')
    .update({ 
      name: newName,
      start_date: startDate,
      end_date: endDate
    })
    .eq('id', tripId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete a trip (travel steps will need to be reassigned or deleted)
export async function deleteTrip(tripId) {
  // First, unassign all travel steps from this trip
  await getSupabase()
    .from('travel_steps')
    .update({ trip_id: null })
    .eq('trip_id', tripId);
  
  // Then delete the trip
  const { error } = await getSupabase()
    .from('trips')
    .delete()
    .eq('id', tripId);
  
  if (error) throw error;
}

// Generate a shareable link token
export async function regenerateShareToken(tripId) {
  const newToken = generateShareToken();
  const { data, error } = await getSupabase()
    .from('trips')
    .update({ share_token: newToken })
    .eq('id', tripId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Toggle public sharing
export async function setTripPublic(tripId, isPublic) {
  const { data, error } = await getSupabase()
    .from('trips')
    .update({ is_public: isPublic })
    .eq('id', tripId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Helper to generate random share token
export function generateShareToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// State abbreviation to full name mapping
const STATE_NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'Washington DC'
};

// Extract city name from location string (removes airport codes, addresses, common suffixes)
export function extractCity(locationStr) {
  if (!locationStr) return null;
  
  // Remove airport code in parentheses: "San Francisco (SFO)" -> "San Francisco"
  let city = locationStr.replace(/\s*\([A-Z]{3}\)\s*$/i, '').trim();
  // Remove trailing airport code: "San Francisco SFO" -> "San Francisco"
  city = city.replace(/\s+[A-Z]{3}$/i, '').trim();
  
  // Remove common location suffixes
  const suffixes = ['Airport', 'International Airport', 'Int\'l Airport', 'Intl Airport',
    'Station', 'Terminal', 'Center', 'Centre', 'Downtown'];
  for (const suffix of suffixes) {
    const suffixRegex = new RegExp(`\\s+${suffix}$`, 'i');
    city = city.replace(suffixRegex, '').trim();
  }
  
  // Remove hotel chain names and common prefixes
  const hotelChains = ['Aloft', 'Marriott', 'Hilton', 'Hyatt', 'Sheraton', 'Westin', 
    'Holiday Inn', 'Hampton Inn', 'Best Western', 'Courtyard', 'Fairfield', 
    'Residence Inn', 'SpringHill', 'TownePlace', 'DoubleTree', 'Embassy Suites',
    'La Quinta', 'Comfort Inn', 'Days Inn', 'Super 8', 'Motel 6', 'Red Roof'];
  
  for (const chain of hotelChains) {
    const chainRegex = new RegExp(`^${chain}\\s+`, 'i');
    city = city.replace(chainRegex, '').trim();
  }
  
  return city || null;
}

// Extract city from hotel address (parses "City, State" from full address)
export function extractCityFromAddress(address) {
  if (!address) return null;
  
  // Try to parse: "Street, City, State ZIP" or "Street, City, State"
  // Look for the city which is typically before the state abbreviation
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    // The city is usually the second-to-last part before state/ZIP
    // Format: "123 Main St, Brooklyn, NY 11201" -> "Brooklyn"
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      // Skip if it's a state+ZIP like "NY 11201" or just state "NY"
      if (/^[A-Z]{2}\s*\d*/.test(part)) continue;
      // Skip if it looks like a street number
      if (/^\d+\s/.test(part)) continue;
      // This is likely the city
      return part;
    }
  }
  
  return null;
}

// Extract state abbreviation from address or location string
export function extractState(addressOrLocation) {
  if (!addressOrLocation) return null;
  
  // Try to find state abbreviation pattern: ", CA " or ", CA," or ", CA 12345"
  const stateMatch = addressOrLocation.match(/,\s*([A-Z]{2})\s*(?:\d{5}|,|$)/i);
  if (stateMatch) {
    const state = stateMatch[1].toUpperCase();
    if (STATE_NAMES[state]) return state;
  }
  
  // Try to find state name
  for (const [abbr, name] of Object.entries(STATE_NAMES)) {
    if (addressOrLocation.toLowerCase().includes(name.toLowerCase())) {
      return abbr;
    }
  }
  
  return null;
}

// Auto-group travel steps into trips based on proximity, return flights, and destinations
export function suggestTripGroupings(travelSteps) {
  if (!travelSteps || travelSteps.length === 0) return [];
  
  const MAX_GAP_DAYS = 7; // Maximum days between steps to be same trip
  
  const sorted = [...travelSteps].sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const trips = [];
  let currentTrip = {
    steps: [sorted[0]],
    destinations: new Set([sorted[0].destination_name, sorted[0].origin_name].filter(Boolean)),
    // Track the origin city of the trip (where the first outbound flight departed from)
    tripOrigin: sorted[0].type === 'flight' ? extractCity(sorted[0].origin_name) : null
  };
  
  for (let i = 1; i < sorted.length; i++) {
    const step = sorted[i];
    const prevStep = sorted[i - 1];
    
    const prevEnd = prevStep.end_datetime || prevStep.start_datetime;
    const gapDays = (new Date(step.start_datetime) - new Date(prevEnd)) / (1000 * 60 * 60 * 24);
    
    // Check if destinations are related (same or nearby)
    const stepDestination = step.destination_name || step.origin_name;
    const isNearbyDestination = currentTrip.destinations.has(stepDestination) ||
      currentTrip.destinations.has(step.origin_name);
    
    // Check if this is a return flight (destination matches trip origin)
    const isReturnFlight = step.type === 'flight' && 
      currentTrip.tripOrigin && 
      extractCity(step.destination_name) === currentTrip.tripOrigin;
    
    // Group if: within 7 days OR destinations overlap OR is return flight
    if (gapDays <= MAX_GAP_DAYS || isNearbyDestination || isReturnFlight) {
      currentTrip.steps.push(step);
      if (stepDestination) currentTrip.destinations.add(stepDestination);
      if (step.origin_name) currentTrip.destinations.add(step.origin_name);
    } else {
      // Start a new trip
      trips.push(currentTrip);
      currentTrip = {
        steps: [step],
        destinations: new Set([stepDestination, step.origin_name].filter(Boolean)),
        tripOrigin: step.type === 'flight' ? extractCity(step.origin_name) : null
      };
    }
  }
  
  // Don't forget the last trip
  trips.push(currentTrip);
  
  // Convert to trip suggestions with metadata
  return trips.map((trip) => {
    const startDate = new Date(trip.steps[0].start_datetime);
    const endDate = new Date(trip.steps[trip.steps.length - 1].end_datetime || 
                            trip.steps[trip.steps.length - 1].start_datetime);
    
    return {
      suggestedName: generateTripName(trip.steps),
      startDate,
      endDate,
      destinations: Array.from(trip.destinations),
      steps: trip.steps,
      nightCount: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    };
  });
}

// Generate a trip name based on stays (no dates - dates shown in subtitle)
export function generateTripName(steps) {
  // Get all stays (hotels)
  const stays = steps.filter(s => s.type === 'hotel');
  
  // Extract unique stay cities - try address first, then name
  const stayCities = [...new Set(
    stays.map(s => {
      // First try to get city from address (most reliable)
      const cityFromAddress = extractCityFromAddress(s.origin_address);
      if (cityFromAddress) return cityFromAddress;
      
      // Fall back to parsing the hotel name
      // For "Aloft New York Brooklyn", extract the location part
      const name = s.origin_name || '';
      
      // Remove hotel chain prefixes
      const hotelChains = ['Aloft', 'Marriott', 'Hilton', 'Hyatt', 'Sheraton', 'Westin', 
        'Holiday Inn', 'Hampton Inn', 'Best Western', 'Courtyard', 'Fairfield', 
        'Residence Inn', 'SpringHill', 'TownePlace', 'DoubleTree', 'Embassy Suites'];
      
      let location = name;
      for (const chain of hotelChains) {
        const chainRegex = new RegExp(`^${chain}\\s+`, 'i');
        location = location.replace(chainRegex, '').trim();
      }
      
      // If we still have a valid location, use the last word as the city
      // e.g., "New York Brooklyn" -> "Brooklyn"
      if (location) {
        const words = location.split(/\s+/);
        if (words.length > 0) {
          // Return the last meaningful word as city
          return words[words.length - 1];
        }
      }
      
      return extractCity(s.origin_name);
    }).filter(Boolean)
  )];
  
  // Case: No stays - use landing city from first flight, or location of first step
  if (stayCities.length === 0) {
    const firstFlight = steps.find(s => s.type === 'flight');
    if (firstFlight && firstFlight.destination_name) {
      return extractCity(firstFlight.destination_name) || 'Trip';
    }
    
    // Fallback: use location of first step (e.g., car rental location)
    const firstStep = steps[0];
    if (firstStep) {
      // Try address first
      const cityFromAddress = extractCityFromAddress(firstStep.origin_address);
      if (cityFromAddress) return cityFromAddress;
      
      // Try origin name
      const cityFromOrigin = extractCity(firstStep.origin_name);
      if (cityFromOrigin) return cityFromOrigin;
      
      // Try destination
      const cityFromDest = extractCity(firstStep.destination_name);
      if (cityFromDest) return cityFromDest;
    }
    return 'Trip';
  }
  
  // Case: 1 stay city
  if (stayCities.length === 1) {
    return stayCities[0];
  }
  
  // Case: 2 stay cities
  if (stayCities.length === 2) {
    return `${stayCities[0]} and ${stayCities[1]}`;
  }
  
  // Case: 3+ stay cities - try to find common state
  const stayStates = stays
    .map(s => extractState(s.origin_address) || extractState(s.origin_name))
    .filter(Boolean);
  
  const uniqueStates = [...new Set(stayStates)];
  
  // If all stays are in the same state, use state name
  if (uniqueStates.length === 1 && STATE_NAMES[uniqueStates[0]]) {
    return STATE_NAMES[uniqueStates[0]];
  }
  
  // Fallback: first city + count
  return `${stayCities[0]} + ${stayCities.length - 1} more`;
}

