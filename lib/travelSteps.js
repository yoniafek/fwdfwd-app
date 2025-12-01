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
  // Build the insert object with only fields that have values
  // This prevents errors from columns that don't exist yet
  const insertData = {
    user_id: userId,
    type: step.type,
    start_datetime: step.start_datetime,
    origin_name: step.origin_name
  };

  // Add optional fields only if they have values
  if (step.end_datetime) insertData.end_datetime = step.end_datetime;
  if (step.custom_title) insertData.custom_title = step.custom_title;
  if (step.origin_address) insertData.origin_address = step.origin_address;
  if (step.origin_lat) insertData.origin_lat = step.origin_lat;
  if (step.origin_lng) insertData.origin_lng = step.origin_lng;
  if (step.origin_terminal) insertData.origin_terminal = step.origin_terminal;
  if (step.origin_gate) insertData.origin_gate = step.origin_gate;
  if (step.destination_name) insertData.destination_name = step.destination_name;
  if (step.destination_address) insertData.destination_address = step.destination_address;
  if (step.destination_lat) insertData.destination_lat = step.destination_lat;
  if (step.destination_lng) insertData.destination_lng = step.destination_lng;
  if (step.destination_terminal) insertData.destination_terminal = step.destination_terminal;
  if (step.destination_gate) insertData.destination_gate = step.destination_gate;
  if (step.carrier_name) insertData.carrier_name = step.carrier_name;
  if (step.confirmation_number) insertData.confirmation_number = step.confirmation_number;
  if (step.trip_id) insertData.trip_id = step.trip_id;

  const { data, error } = await getSupabase()
    .from('travel_steps')
    .insert([insertData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Update an existing travel step
export async function updateTravelStep(stepId, updates) {
  // Build update object with only provided fields
  const updateData = {};
  
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.start_datetime !== undefined) updateData.start_datetime = updates.start_datetime;
  if (updates.end_datetime !== undefined) updateData.end_datetime = updates.end_datetime || null;
  if (updates.custom_title !== undefined) updateData.custom_title = updates.custom_title || null;
  if (updates.origin_name !== undefined) updateData.origin_name = updates.origin_name;
  if (updates.origin_address !== undefined) updateData.origin_address = updates.origin_address || null;
  if (updates.origin_lat !== undefined) updateData.origin_lat = updates.origin_lat || null;
  if (updates.origin_lng !== undefined) updateData.origin_lng = updates.origin_lng || null;
  if (updates.origin_terminal !== undefined) updateData.origin_terminal = updates.origin_terminal || null;
  if (updates.origin_gate !== undefined) updateData.origin_gate = updates.origin_gate || null;
  if (updates.destination_name !== undefined) updateData.destination_name = updates.destination_name || null;
  if (updates.destination_address !== undefined) updateData.destination_address = updates.destination_address || null;
  if (updates.destination_lat !== undefined) updateData.destination_lat = updates.destination_lat || null;
  if (updates.destination_lng !== undefined) updateData.destination_lng = updates.destination_lng || null;
  if (updates.destination_terminal !== undefined) updateData.destination_terminal = updates.destination_terminal || null;
  if (updates.destination_gate !== undefined) updateData.destination_gate = updates.destination_gate || null;
  if (updates.carrier_name !== undefined) updateData.carrier_name = updates.carrier_name || null;
  if (updates.confirmation_number !== undefined) updateData.confirmation_number = updates.confirmation_number || null;

  const { data, error } = await getSupabase()
    .from('travel_steps')
    .update(updateData)
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
