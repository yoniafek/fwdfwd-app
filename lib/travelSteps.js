import { getSupabase } from './supabase';

// Fetch all travel steps for the current user
export async function fetchTravelSteps() {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .select('*')
    .order('start_datetime', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Fetch travel steps for a specific trip
export async function fetchTravelStepsByTrip(tripId) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .select('*')
    .eq('trip_id', tripId)
    .order('start_datetime', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Create a new travel step
export async function createTravelStep(userId, step) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .insert([{ 
      user_id: userId,
      type: step.type,
      start_datetime: step.start_datetime,
      end_datetime: step.end_datetime || null,
      origin_name: step.origin_name,
      origin_address: step.origin_address || null,
      origin_lat: step.origin_lat || null,
      origin_lng: step.origin_lng || null,
      origin_terminal: step.origin_terminal || null,
      origin_gate: step.origin_gate || null,
      destination_name: step.destination_name || null,
      destination_address: step.destination_address || null,
      destination_lat: step.destination_lat || null,
      destination_lng: step.destination_lng || null,
      destination_terminal: step.destination_terminal || null,
      destination_gate: step.destination_gate || null,
      carrier_name: step.carrier_name || null,
      confirmation_number: step.confirmation_number || null,
      trip_id: step.trip_id || null
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update an existing travel step
export async function updateTravelStep(stepId, updates) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .update({
      type: updates.type,
      start_datetime: updates.start_datetime,
      end_datetime: updates.end_datetime || null,
      origin_name: updates.origin_name,
      origin_address: updates.origin_address || null,
      origin_lat: updates.origin_lat || null,
      origin_lng: updates.origin_lng || null,
      origin_terminal: updates.origin_terminal || null,
      origin_gate: updates.origin_gate || null,
      destination_name: updates.destination_name || null,
      destination_address: updates.destination_address || null,
      destination_lat: updates.destination_lat || null,
      destination_lng: updates.destination_lng || null,
      destination_terminal: updates.destination_terminal || null,
      destination_gate: updates.destination_gate || null,
      carrier_name: updates.carrier_name || null,
      confirmation_number: updates.confirmation_number || null
    })
    .eq('id', stepId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete a travel step
export async function deleteTravelStep(stepId) {
  const { error } = await getSupabase()
    .from('travel_steps')
    .delete()
    .eq('id', stepId);
  
  if (error) throw error;
}

// Move a travel step to a different trip
export async function moveTravelStepToTrip(stepId, tripId) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .update({ trip_id: tripId })
    .eq('id', stepId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Bulk assign steps to a trip
export async function assignStepsToTrip(stepIds, tripId) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .update({ trip_id: tripId })
    .in('id', stepIds)
    .select();
  
  if (error) throw error;
  return data;
}
