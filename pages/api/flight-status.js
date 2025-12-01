import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { stepId, forceRefresh = false } = req.body;

  if (!stepId) {
    return res.status(400).json({ error: 'Missing stepId' });
  }

  if (!AVIATIONSTACK_API_KEY) {
    return res.status(500).json({ error: 'AviationStack API key not configured' });
  }

  try {
    // Fetch the travel step
    const { data: step, error: fetchError } = await supabase
      .from('travel_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (fetchError || !step) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    if (step.type !== 'flight') {
      return res.status(400).json({ error: 'Not a flight' });
    }

    // Check if flight has already landed
    const now = new Date();
    const arrivalTime = step.end_datetime ? new Date(step.end_datetime) : null;
    
    if (arrivalTime && arrivalTime < now) {
      // Flight has landed - update status and return
      const { error: updateError } = await supabase
        .from('travel_steps')
        .update({ 
          flight_status: 'landed',
          flight_status_checked_at: now.toISOString()
        })
        .eq('id', stepId);

      if (updateError) {
        console.error('Error updating landed status:', updateError);
      }

      return res.status(200).json({ 
        status: 'landed',
        message: 'Flight has landed'
      });
    }

    // Check if we should skip the API call (rate limiting)
    if (!forceRefresh && step.flight_status_checked_at) {
      const lastChecked = new Date(step.flight_status_checked_at);
      const hoursSinceCheck = (now - lastChecked) / (1000 * 60 * 60);
      
      // Don't check more than once per hour unless forced
      if (hoursSinceCheck < 1) {
        return res.status(200).json({ 
          status: step.flight_status,
          cached: true,
          message: 'Using cached status'
        });
      }
    }

    // Check if flight is within 48 hours
    const departureTime = new Date(step.start_datetime);
    const hoursToDeparture = (departureTime - now) / (1000 * 60 * 60);
    
    if (hoursToDeparture > 48) {
      return res.status(200).json({ 
        status: null,
        message: 'Flight is more than 48 hours away'
      });
    }

    // Extract flight code from carrier name
    const flightCode = extractFlightCode(step.carrier_name);
    if (!flightCode) {
      return res.status(400).json({ error: 'Could not extract flight code from carrier name' });
    }

    // Format date for API
    const flightDate = step.start_datetime.split('T')[0];

    // Call AviationStack API
    console.log(`Fetching status for flight ${flightCode} on ${flightDate}`);
    
    const apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${AVIATIONSTACK_API_KEY}&flight_iata=${flightCode}&flight_date=${flightDate}`;
    
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json();

    if (apiData.error) {
      console.error('AviationStack API error:', apiData.error);
      return res.status(500).json({ error: 'API error', details: apiData.error.message });
    }

    // Parse the response
    let flightStatus = 'unknown';
    let flightInfo = null;

    if (apiData.data && apiData.data.length > 0) {
      const flight = apiData.data[0];
      flightInfo = flight;
      
      // Map AviationStack status to our status
      const statusMap = {
        'scheduled': 'on_time',
        'active': 'on_time',
        'landed': 'landed',
        'cancelled': 'cancelled',
        'incident': 'delayed',
        'diverted': 'delayed'
      };

      flightStatus = statusMap[flight.flight_status] || 'unknown';

      // Check for delays
      if (flight.departure?.delay && flight.departure.delay > 15) {
        flightStatus = 'delayed';
      }

      // Update gate information if available
      const updateData = {
        flight_status: flightStatus,
        flight_status_checked_at: now.toISOString()
      };

      // Update departure gate if available and not already set
      if (flight.departure?.gate && !step.origin_gate) {
        updateData.origin_gate = flight.departure.gate;
      }
      
      // Update departure terminal if available and not already set
      if (flight.departure?.terminal && !step.origin_terminal) {
        updateData.origin_terminal = flight.departure.terminal;
      }

      // Update arrival gate if available and not already set
      if (flight.arrival?.gate && !step.destination_gate) {
        updateData.destination_gate = flight.arrival.gate;
      }
      
      // Update arrival terminal if available and not already set
      if (flight.arrival?.terminal && !step.destination_terminal) {
        updateData.destination_terminal = flight.arrival.terminal;
      }

      const { error: updateError } = await supabase
        .from('travel_steps')
        .update(updateData)
        .eq('id', stepId);

      if (updateError) {
        console.error('Error updating flight status:', updateError);
      }
    } else {
      // No data found - just update the checked timestamp
      await supabase
        .from('travel_steps')
        .update({ flight_status_checked_at: now.toISOString() })
        .eq('id', stepId);
    }

    return res.status(200).json({ 
      status: flightStatus,
      flightInfo: flightInfo ? {
        status: flightInfo.flight_status,
        departure: flightInfo.departure,
        arrival: flightInfo.arrival
      } : null,
      message: 'Status updated'
    });

  } catch (error) {
    console.error('Error fetching flight status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Extract flight code from carrier name (e.g., "United • UA 2011" -> "UA2011")
function extractFlightCode(carrierName) {
  if (!carrierName) return null;
  
  const cleaned = carrierName.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/([A-Z]{2})\s*(\d{1,4})/i);
  
  if (match) {
    return `${match[1].toUpperCase()}${match[2]}`;
  }
  
  return null;
}

