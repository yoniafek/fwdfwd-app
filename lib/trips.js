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
function generateShareToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Auto-group travel steps into trips based on proximity
export function suggestTripGroupings(travelSteps) {
  if (!travelSteps || travelSteps.length === 0) return [];
  
  const sorted = [...travelSteps].sort(
    (a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const trips = [];
  let currentTrip = {
    steps: [sorted[0]],
    destinations: new Set([sorted[0].destination_name || sorted[0].origin_name].filter(Boolean))
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
    
    // Group if: within 3 days OR destinations overlap
    if (gapDays <= 3 || isNearbyDestination) {
      currentTrip.steps.push(step);
      if (stepDestination) currentTrip.destinations.add(stepDestination);
      if (step.origin_name) currentTrip.destinations.add(step.origin_name);
    } else {
      // Start a new trip
      trips.push(currentTrip);
      currentTrip = {
        steps: [step],
        destinations: new Set([stepDestination, step.origin_name].filter(Boolean))
      };
    }
  }
  
  // Don't forget the last trip
  trips.push(currentTrip);
  
  // Convert to trip suggestions with metadata
  return trips.map((trip, index) => {
    const startDate = new Date(trip.steps[0].start_datetime);
    const endDate = new Date(trip.steps[trip.steps.length - 1].end_datetime || 
                            trip.steps[trip.steps.length - 1].start_datetime);
    const destinations = Array.from(trip.destinations);
    
    return {
      suggestedName: generateTripName(destinations, startDate),
      startDate,
      endDate,
      destinations,
      steps: trip.steps,
      nightCount: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
    };
  });
}

// Generate a trip name from destinations
function generateTripName(destinations, startDate) {
  const month = startDate.toLocaleString('en-US', { month: 'short' });
  const year = startDate.getFullYear().toString().slice(-2);
  
  if (destinations.length === 0) {
    return `Trip - ${month} '${year}`;
  }
  
  // Clean up destination names (remove airport codes, etc.)
  const cleanDestinations = destinations
    .map(d => d.replace(/\s*\([A-Z]{3}\)\s*/g, '').trim())
    .filter(d => d.length > 0);
  
  if (cleanDestinations.length === 1) {
    return `${cleanDestinations[0]} - ${month} '${year}`;
  }
  
  if (cleanDestinations.length === 2) {
    return `${cleanDestinations[0]} & ${cleanDestinations[1]} - ${month} '${year}`;
  }
  
  return `${cleanDestinations[0]} + ${cleanDestinations.length - 1} more - ${month} '${year}`;
}

