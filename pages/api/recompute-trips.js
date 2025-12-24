import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_GAP_DAYS = 3;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Fetch all travel steps for the user
    const { data: steps, error: stepsError } = await supabase
      .from('travel_steps')
      .select('*')
      .eq('user_id', user_id)
      .order('start_datetime', { ascending: true });

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      return res.status(500).json({ error: 'Failed to fetch travel steps' });
    }

    if (!steps || steps.length === 0) {
      return res.status(200).json({ message: 'No travel steps to group', trips: [] });
    }

    // Delete existing trips for this user (we'll recreate them)
    const { error: deleteError } = await supabase
      .from('trips')
      .delete()
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting old trips:', deleteError);
      return res.status(500).json({ error: 'Failed to clear old trips' });
    }

    // Detect trips from steps
    const detectedTrips = detectTrips(steps);

    // Create new trips and update step associations
    const createdTrips = [];

    for (const tripData of detectedTrips) {
      // Insert the trip
      const { data: newTrip, error: tripError } = await supabase
        .from('trips')
        .insert([{
          user_id: user_id,
          name: tripData.name,
          start_date: tripData.start_date,
          end_date: tripData.end_date
        }])
        .select()
        .single();

      if (tripError) {
        console.error('Error creating trip:', tripError);
        continue;
      }

      // Update all steps in this trip with the trip_id
      const { error: updateError } = await supabase
        .from('travel_steps')
        .update({ trip_id: newTrip.id })
        .in('id', tripData.stepIds);

      if (updateError) {
        console.error('Error updating steps with trip_id:', updateError);
      }

      createdTrips.push({
        ...newTrip,
        step_count: tripData.stepIds.length
      });
    }

    return res.status(200).json({
      success: true,
      message: `Created ${createdTrips.length} trips from ${steps.length} travel steps`,
      trips: createdTrips
    });

  } catch (error) {
    console.error('Error recomputing trips:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Detect trips from steps based on time proximity
function detectTrips(steps) {
  if (!steps || steps.length === 0) return [];
  
  const sortedSteps = [...steps].sort((a, b) => 
    new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const trips = [];
  let currentTripSteps = [sortedSteps[0]];
  
  for (let i = 1; i < sortedSteps.length; i++) {
    const prevStep = sortedSteps[i - 1];
    const currentStep = sortedSteps[i];
    
    const prevEndDate = prevStep.end_datetime || prevStep.start_datetime;
    const gap = daysBetween(prevEndDate, currentStep.start_datetime);
    
    if (gap <= MAX_GAP_DAYS) {
      currentTripSteps.push(currentStep);
    } else {
      trips.push(createTripFromSteps(currentTripSteps));
      currentTripSteps = [currentStep];
    }
  }
  
  if (currentTripSteps.length > 0) {
    trips.push(createTripFromSteps(currentTripSteps));
  }
  
  return trips;
}

function createTripFromSteps(steps) {
  const sortedSteps = [...steps].sort((a, b) => 
    new Date(a.start_datetime) - new Date(b.start_datetime)
  );
  
  const firstStep = sortedSteps[0];
  const lastStep = sortedSteps[sortedSteps.length - 1];
  
  return {
    name: generateTripName(steps),
    start_date: firstStep.start_datetime,
    end_date: lastStep.end_datetime || lastStep.start_datetime,
    stepIds: steps.map(s => s.id)
  };
}

function generateTripName(steps) {
  if (!steps || steps.length === 0) return 'Untitled Trip';
  
  const locations = [];
  for (const step of steps) {
    if (step.type === 'flight' && step.destination_name) {
      locations.push(step.destination_name);
    } else if (step.origin_name) {
      locations.push(step.origin_name);
    }
  }
  
  if (locations.length === 0) return 'Untitled Trip';
  
  const locationCounts = {};
  for (const loc of locations) {
    const cleanLoc = loc.replace(/\s*\([^)]*\)\s*/g, '').trim();
    if (cleanLoc) {
      locationCounts[cleanLoc] = (locationCounts[cleanLoc] || 0) + 1;
    }
  }
  
  let primaryLocation = '';
  let maxCount = 0;
  
  for (const [loc, count] of Object.entries(locationCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primaryLocation = loc;
    }
  }
  
  if (!primaryLocation) {
    const lastFlight = [...steps].reverse().find(s => s.type === 'flight');
    if (lastFlight && lastFlight.destination_name) {
      primaryLocation = lastFlight.destination_name.replace(/\s*\([^)]*\)\s*/g, '').trim();
    }
  }
  
  if (!primaryLocation && locations[0]) {
    primaryLocation = locations[0].replace(/\s*\([^)]*\)\s*/g, '').trim();
  }
  
  return primaryLocation ? `Trip to ${primaryLocation}` : 'Untitled Trip';
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
