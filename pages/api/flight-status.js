import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { stepId, flightNumber, departureDate } = req.body;

    if (!stepId || !flightNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('Checking flight status for:', flightNumber, 'on', departureDate);

    // Extract airline code and flight number
    const flightCode = extractFlightCode(flightNumber);
    if (!flightCode) {
      return res.status(400).json({ error: 'Could not parse flight number' });
    }

    // Check if we have a recent cached status (within 1 hour)
    // Note: This will fail silently if columns don't exist yet
    try {
      const { data: existingStep } = await supabase
        .from('travel_steps')
        .select('flight_status, flight_status_checked_at')
        .eq('id', stepId)
        .single();

      if (existingStep?.flight_status_checked_at) {
        const lastChecked = new Date(existingStep.flight_status_checked_at);
        const hoursSinceCheck = (Date.now() - lastChecked) / (1000 * 60 * 60);
        
        if (hoursSinceCheck < 1 && existingStep.flight_status) {
          console.log('Using cached status:', existingStep.flight_status);
          return res.status(200).json({ 
            status: existingStep.flight_status,
            cached: true
          });
        }
      }
    } catch (cacheError) {
      console.log('Could not check cache (column may not exist):', cacheError.message);
    }

    // Call AviationStack API
    const aviationStackKey = process.env.AVIATIONSTACK_API_KEY;
    
    if (!aviationStackKey) {
      console.error('AVIATIONSTACK_API_KEY not configured');
      return res.status(500).json({ error: 'Flight status API not configured' });
    }

    // Format date for API (YYYY-MM-DD)
    let flightDate = '';
    if (departureDate) {
      const dateMatch = departureDate.match(/^(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        flightDate = dateMatch[1];
      }
    }

    const apiUrl = `http://api.aviationstack.com/v1/flights?access_key=${aviationStackKey}&flight_iata=${flightCode.airline}${flightCode.number}${flightDate ? `&flight_date=${flightDate}` : ''}`;
    
    console.log('Calling AviationStack API for flight:', flightCode.airline + flightCode.number);

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error('AviationStack error:', data.error);
      return res.status(500).json({ error: 'Flight API error', details: data.error.message });
    }

    // Parse the response
    let status = null;
    let flightInfo = null;

    if (data.data && data.data.length > 0) {
      const flight = data.data[0];
      
      // Determine status
      const flightStatus = flight.flight_status?.toLowerCase();
      
      if (flightStatus === 'landed' || flightStatus === 'arrived') {
        status = 'landed';
      } else if (flightStatus === 'active' || flightStatus === 'en-route') {
        status = 'in_flight';
      } else if (flight.departure?.delay && flight.departure.delay > 15) {
        status = 'delayed';
      } else if (flightStatus === 'scheduled' || flightStatus === 'on-time') {
        status = 'on_time';
      } else if (flightStatus === 'cancelled') {
        status = 'cancelled';
      }

      flightInfo = {
        departure: {
          airport: flight.departure?.airport,
          terminal: flight.departure?.terminal,
          gate: flight.departure?.gate,
          delay: flight.departure?.delay,
          scheduled: flight.departure?.scheduled,
          estimated: flight.departure?.estimated,
          actual: flight.departure?.actual
        },
        arrival: {
          airport: flight.arrival?.airport,
          terminal: flight.arrival?.terminal,
          gate: flight.arrival?.gate,
          delay: flight.arrival?.delay,
          scheduled: flight.arrival?.scheduled,
          estimated: flight.arrival?.estimated,
          actual: flight.arrival?.actual
        },
        status: flightStatus
      };

      console.log('Flight status:', status, 'Raw status:', flightStatus);
    } else {
      console.log('No flight data returned from API');
    }

    // Update the database with the new status (defensive - may fail if columns don't exist)
    try {
      if (status) {
        const { error: updateError } = await supabase
          .from('travel_steps')
          .update({
            flight_status: status,
            flight_status_checked_at: new Date().toISOString(),
            // Update gate/terminal if we got new info
            ...(flightInfo?.departure?.gate && { origin_gate: flightInfo.departure.gate }),
            ...(flightInfo?.departure?.terminal && { origin_terminal: flightInfo.departure.terminal }),
            ...(flightInfo?.arrival?.gate && { destination_gate: flightInfo.arrival.gate }),
            ...(flightInfo?.arrival?.terminal && { destination_terminal: flightInfo.arrival.terminal })
          })
          .eq('id', stepId);

        if (updateError) {
          console.error('Error updating flight status:', updateError);
        }
      } else {
        // Just update the checked timestamp
        await supabase
          .from('travel_steps')
          .update({
            flight_status_checked_at: new Date().toISOString()
          })
          .eq('id', stepId);
      }
    } catch (dbUpdateError) {
      console.error('Could not update database (columns may not exist):', dbUpdateError.message);
    }

    return res.status(200).json({
      status,
      flightInfo,
      cached: false
    });

  } catch (error) {
    console.error('Error checking flight status:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Extract airline code and flight number from carrier_name
function extractFlightCode(carrierName) {
  if (!carrierName) return null;
  
  // Clean up the string - remove bullets, extra spaces
  const cleaned = carrierName.replace(/[•·]/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Match patterns like "UA 1234", "United UA1234", "AA123"
  const match = cleaned.match(/([A-Z]{2})\s*(\d{1,4})/i);
  
  if (match) {
    return {
      airline: match[1].toUpperCase(),
      number: match[2]
    };
  }
  
  return null;
}
