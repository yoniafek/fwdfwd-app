import { createClient } from '@supabase/supabase-js';
import { suggestTripGroupings, generateShareToken } from '../../lib/trips';

// Use service role key for API operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userEmail } = req.body;
    
    if (!userEmail) {
      return res.status(400).json({ error: 'userEmail is required' });
    }

    console.log('Regrouping trips for user:', userEmail);

    // Look up user ID by email
    const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      user_email: userEmail.toLowerCase()
    });

    if (rpcError || !userId) {
      console.error('User lookup error:', rpcError);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Found user ID:', userId);

    // Step 1: Fetch all travel steps for the user
    const { data: allSteps, error: stepsError } = await supabase
      .from('travel_steps')
      .select('*')
      .eq('user_id', userId)
      .order('start_datetime', { ascending: true });

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      return res.status(500).json({ error: 'Failed to fetch travel steps' });
    }

    console.log('Found', allSteps?.length || 0, 'travel steps');

    if (!allSteps || allSteps.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No travel steps to group',
        tripsCreated: 0
      });
    }

    // Step 2: Delete all existing trips for this user (steps are preserved)
    const { data: existingTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('user_id', userId);

    if (tripsError) {
      console.error('Error fetching existing trips:', tripsError);
    }

    if (existingTrips && existingTrips.length > 0) {
      console.log('Deleting', existingTrips.length, 'existing trips');
      
      // First, unassign all steps from trips
      await supabase
        .from('travel_steps')
        .update({ trip_id: null })
        .eq('user_id', userId);
      
      // Then delete all trips
      const tripIds = existingTrips.map(t => t.id);
      await supabase
        .from('trips')
        .delete()
        .in('id', tripIds);
    }

    // Step 3: Run the grouping algorithm
    const tripGroupings = suggestTripGroupings(allSteps);
    console.log('Created', tripGroupings.length, 'trip groupings');

    // Step 4: Create new trips and assign steps
    const createdTrips = [];
    
    for (const grouping of tripGroupings) {
      // Create the trip
      const { data: newTrip, error: createError } = await supabase
        .from('trips')
        .insert([{
          user_id: userId,
          name: grouping.suggestedName,
          start_date: grouping.startDate.toISOString().split('T')[0],
          end_date: grouping.endDate.toISOString().split('T')[0],
          share_token: generateShareToken()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating trip:', createError);
        continue;
      }

      // Assign steps to the trip
      const stepIds = grouping.steps.map(s => s.id);
      await supabase
        .from('travel_steps')
        .update({ trip_id: newTrip.id })
        .in('id', stepIds);

      createdTrips.push({
        id: newTrip.id,
        name: newTrip.name,
        stepCount: stepIds.length,
        startDate: grouping.startDate.toISOString().split('T')[0],
        endDate: grouping.endDate.toISOString().split('T')[0]
      });

      console.log('Created trip:', newTrip.name, 'with', stepIds.length, 'steps');
    }

    return res.status(200).json({
      success: true,
      message: `Regrouped ${allSteps.length} steps into ${createdTrips.length} trips`,
      tripsCreated: createdTrips.length,
      trips: createdTrips
    });

  } catch (error) {
    console.error('Error regrouping trips:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

