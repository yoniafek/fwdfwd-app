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
    .insert([{ ...step, user_id: userId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update an existing travel step
export async function updateTravelStep(stepId, updates) {
  const { data, error } = await getSupabase()
    .from('travel_steps')
    .update(updates)
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

