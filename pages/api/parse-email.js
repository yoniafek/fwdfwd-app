import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use service role key for API operations (bypasses RLS)
// This is safe because this is server-side only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { from, subject, text, html } = req.body;
    
    if (!from || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required email fields' });
    }

    const emailContent = html || text;
    const senderEmail = from.toLowerCase();

    console.log('Processing email from:', senderEmail);

    // FIRST: Try to store the raw email for 30 days (non-blocking)
    let storedEmail = null;
    try {
      const { data, error: storeError } = await supabase
        .from('raw_emails')
        .insert([{
          sender_email: senderEmail,
          subject: subject,
          html_content: html,
          text_content: text
        }])
        .select()
        .single();

      if (storeError) {
        console.error('Error storing email (non-blocking):', storeError.message);
      } else {
        storedEmail = data;
        console.log('Stored raw email with ID:', storedEmail.id);
      }
    } catch (emailStoreError) {
      console.error('Exception storing email (non-blocking):', emailStoreError.message);
    }

    // Use Claude to parse the email with improved prompt
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are parsing a travel confirmation email. Extract ALL booking details precisely and return ONLY valid JSON.

Email content:
${emailContent}

CRITICAL TIMEZONE INSTRUCTIONS:
1. ALL times must be in LOCAL TIME with timezone offset
2. Departure time = LOCAL time at departure airport
3. Arrival time = LOCAL time at arrival airport
4. Use ISO 8601 format: "YYYY-MM-DDTHH:MM:SS±HH:00"
5. Common US timezone offsets:
   - EST/EDT (Eastern): -05:00 / -04:00
   - CST/CDT (Central): -06:00 / -05:00
   - MST/MDT (Mountain): -07:00 / -06:00
   - PST/PDT (Pacific): -08:00 / -07:00
6. If timezone is unclear, infer from airport location

EXTRACTION INSTRUCTIONS:
1. Extract EXACT times from the email - do not invent or approximate
2. For flights: extract departure AND arrival times (both in LOCAL time)
3. Include airline + flight number in carrier_name (e.g., "United • UA 1234")
4. Extract terminal and gate if available
5. For multi-leg flights, create separate segments for EACH flight
6. Return ONLY valid JSON with no markdown, explanations, or code blocks

Extract this information:
{
  "type": "flight" | "hotel" | "car" | "train" | "bus" | "unknown",
  "segments": [
    {
      "start_datetime": "YYYY-MM-DDTHH:MM:SS-08:00",  // LOCAL departure time with offset
      "end_datetime": "YYYY-MM-DDTHH:MM:SS-05:00",    // LOCAL arrival time with offset
      "origin_name": "City Name (ABC)",               // City name with airport code OR hotel name
      "origin_address": "123 Main St, City, State ZIP", // Full address if available
      "origin_terminal": "3",                          // Terminal if available, null otherwise
      "origin_gate": "A4",                             // Gate if available, null otherwise
      "destination_name": "City Name (XYZ)",          // City name with airport code
      "destination_address": null,                     // Full address if available
      "destination_terminal": "A",                     // Terminal if available
      "destination_gate": null,                        // Gate if available
      "carrier_name": "Airline • XX 1234",            // Airline name + flight number
      "confirmation_number": "XXXXXX"
    }
  ]
}

EXAMPLES:

Flight from SFO to EWR (PST to EST):
{
  "type": "flight",
  "segments": [
    {
      "start_datetime": "2025-11-19T13:00:00-08:00",
      "end_datetime": "2025-11-19T21:29:00-05:00",
      "origin_name": "San Francisco (SFO)",
      "origin_terminal": "3",
      "origin_gate": "A4",
      "destination_name": "Newark (EWR)",
      "destination_terminal": "A",
      "destination_gate": "5",
      "carrier_name": "United • UA 2011",
      "confirmation_number": "ABC123"
    }
  ]
}

Return flight from EWR to SFO (EST to PST):
{
  "type": "flight",
  "segments": [
    {
      "start_datetime": "2025-12-02T18:10:00-05:00",
      "end_datetime": "2025-12-02T21:50:00-08:00",
      "origin_name": "Newark (EWR)",
      "origin_terminal": "A",
      "origin_gate": null,
      "destination_name": "San Francisco (SFO)",
      "destination_terminal": "3",
      "destination_gate": null,
      "carrier_name": "Alaska • AS 293",
      "confirmation_number": "XYZ789"
    }
  ]
}

Hotel:
{
  "type": "hotel",
  "segments": [
    {
      "start_datetime": "2025-11-20T15:00:00-05:00",
      "end_datetime": "2025-11-27T11:00:00-05:00",
      "origin_name": "Aloft New York Brooklyn",
      "origin_address": "216 Duffield St, Brooklyn, NY 11201",
      "origin_terminal": null,
      "origin_gate": null,
      "destination_name": null,
      "destination_address": null,
      "destination_terminal": null,
      "destination_gate": null,
      "carrier_name": "Marriott",
      "confirmation_number": "12345678"
    }
  ]
}

If you cannot extract valid booking details with confidence, return:
{ "type": "unknown", "segments": [] }`
      }]
    });

    const responseText = message.content[0].text;
    let parsed;
    
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        console.error('Failed to parse Claude response:', responseText);
        
        if (storedEmail) {
          await supabase
            .from('raw_emails')
            .update({ 
              processed: true,
              processing_error: 'Failed to parse Claude response'
            })
            .eq('id', storedEmail.id);
        }
        
        throw new Error('Failed to parse Claude response');
      }
    }

    console.log('Claude parsed:', JSON.stringify(parsed, null, 2));

    // Update stored email with parsed data
    if (storedEmail) {
      await supabase
        .from('raw_emails')
        .update({ 
          parsed_data: parsed,
          processed: parsed.type !== 'unknown'
        })
        .eq('id', storedEmail.id);
    }

    // Check if parsing was successful
    if (parsed.type === 'unknown' || !parsed.segments || parsed.segments.length === 0) {
      console.log('Could not parse email - sending error notification');
      
      await resend.emails.send({
        from: 'FWD <add@fwdfwd.com>',
        to: senderEmail,
        subject: 'Unable to Process Your Travel Confirmation',
        html: `
          <p>Hi there,</p>
          
          <p>We received your email but couldn't automatically extract the booking details. This usually happens when:</p>
          
          <ul>
            <li>The email doesn't contain complete travel information (dates, times, locations)</li>
            <li>It's not a standard confirmation email format</li>
            <li>Critical details like confirmation numbers are missing</li>
          </ul>
          
          <p><strong>What to do next:</strong></p>
          <ul>
            <li>Forward your original confirmation email from the airline/hotel (not a forwarded copy)</li>
            <li>Or add your booking manually at <a href="https://fwdfwd.com/app">fwdfwd.com/app</a></li>
          </ul>
          
          <p>If you believe this email should have been processed, please reply and we'll take a look!</p>
          
          <p>Thanks,<br>The FWD Team</p>
        `
      });

      return res.status(200).json({ 
        success: false, 
        message: 'Could not parse email' 
      });
    }

    // Look up user
    const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      user_email: senderEmail
    });

    console.log('User lookup - userId:', userId, 'error:', rpcError);

    if (!userId) {
      console.log('User not found - sending signup email');
      
      await resend.emails.send({
        from: 'FWD <add@fwdfwd.com>',
        to: senderEmail,
        subject: 'Create Your FWD Account to Track This Trip',
        html: `
          <p>Hi there,</p>
          
          <p>We received your ${parsed.type} confirmation, but you don't have a FWD account yet!</p>
          
          <p><strong>To start tracking your travel:</strong></p>
          <ol>
            <li>Create your free account at <a href="https://fwdfwd.com/app">fwdfwd.com/app</a></li>
            <li>Use this email address: <strong>${senderEmail}</strong></li>
            <li>Forward your confirmation emails to <strong>add@fwdfwd.com</strong></li>
          </ol>
          
          <p>Once you sign up, simply forward this confirmation again and we'll add it to your timeline automatically!</p>
          
          <p>Thanks,<br>The FWD Team</p>
        `
      });

      return res.status(200).json({
        success: false,
        message: 'User not found. Signup email sent.'
      });
    }

    // Add segments to timeline with all extracted fields
    const travelSteps = parsed.segments.map(segment => ({
      user_id: userId,
      type: parsed.type,
      start_datetime: segment.start_datetime,
      end_datetime: segment.end_datetime,
      origin_name: segment.origin_name,
      origin_address: segment.origin_address || null,
      origin_terminal: segment.origin_terminal || null,
      origin_gate: segment.origin_gate || null,
      destination_name: segment.destination_name,
      destination_address: segment.destination_address || null,
      destination_terminal: segment.destination_terminal || null,
      destination_gate: segment.destination_gate || null,
      carrier_name: segment.carrier_name,
      confirmation_number: segment.confirmation_number
    }));

    console.log('Inserting', travelSteps.length, 'travel steps');
    console.log('Travel steps to insert:', JSON.stringify(travelSteps, null, 2));

    // Check for duplicates before inserting
    const duplicateChecks = await Promise.all(
      travelSteps.map(async (step) => {
        const { data: existing } = await supabase
          .from('travel_steps')
          .select('id')
          .eq('user_id', step.user_id)
          .eq('type', step.type)
          .eq('start_datetime', step.start_datetime)
          .eq('origin_name', step.origin_name)
          .limit(1);
        
        return { step, isDuplicate: existing && existing.length > 0 };
      })
    );

    const newSteps = duplicateChecks
      .filter(({ isDuplicate }) => !isDuplicate)
      .map(({ step }) => step);

    const duplicateCount = travelSteps.length - newSteps.length;
    
    if (duplicateCount > 0) {
      console.log(`Skipping ${duplicateCount} duplicate step(s)`);
    }

    if (newSteps.length === 0) {
      console.log('All steps are duplicates - nothing to insert');
      
      await resend.emails.send({
        from: 'FWD <add@fwdfwd.com>',
        to: senderEmail,
        subject: `Already in Your Timeline`,
        html: `
          <p>Hi!</p>
          
          <p>We received your email, but this ${parsed.type} is already in your timeline.</p>
          
          <p><a href="https://fwdfwd.com/app" style="display: inline-block; padding: 12px 24px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: 600;">View Your Timeline</a></p>
          
          <p>Thanks,<br>The FWD Team</p>
        `
      });

      return res.status(200).json({ 
        success: true, 
        message: 'Duplicate - already exists',
        segmentsAdded: 0
      });
    }

    const { data: insertedData, error: insertError } = await supabase
      .from('travel_steps')
      .insert(newSteps)
      .select();

    if (insertError) {
      console.error('Error inserting travel steps:', insertError);
      console.error('Insert error details:', JSON.stringify(insertError, null, 2));
      return res.status(500).json({ error: 'Database error', details: insertError.message });
    }

    console.log('Successfully added travel steps:', insertedData?.length || newSteps.length);

    // AUTO-ASSIGN TO TRIP
    // Fetch all user's steps to determine groupings
    let tripName = null;
    try {
      const { data: allSteps } = await supabase
        .from('travel_steps')
        .select('*')
        .eq('user_id', userId)
        .order('start_datetime', { ascending: true });

      if (allSteps && allSteps.length > 0) {
        // Find or create a matching trip for the new steps
        const tripAssignment = await findOrCreateTripForSteps(supabase, userId, insertedData, allSteps);
        if (tripAssignment) {
          tripName = tripAssignment.tripName;
          console.log('Assigned steps to trip:', tripName);
        }
      }
    } catch (tripError) {
      // Non-blocking - trip assignment failure shouldn't fail the whole request
      console.error('Error assigning trip (non-blocking):', tripError.message);
    }

    // Format segments for confirmation email
    const segmentDescriptions = parsed.segments.map(seg => {
      if (parsed.type === 'flight') {
        // Extract time from ISO string for display
        const deptTime = formatTimeFromISO(seg.start_datetime);
        const arrTime = formatTimeFromISO(seg.end_datetime);
        const deptDate = formatDateFromISO(seg.start_datetime);
        
        return `<strong>${seg.carrier_name}</strong><br>
${seg.origin_name} → ${seg.destination_name}<br>
${deptDate} • Departs ${deptTime}, Arrives ${arrTime}`;
      } else if (parsed.type === 'hotel') {
        const checkin = formatDateFromISO(seg.start_datetime);
        const checkout = formatDateFromISO(seg.end_datetime);
        return `<strong>${seg.origin_name}</strong><br>Check-in: ${checkin}<br>Check-out: ${checkout}`;
      }
      return `${seg.origin_name} → ${seg.destination_name || ''}`;
    }).join('<br><br>');

    await resend.emails.send({
      from: 'FWD <add@fwdfwd.com>',
      to: senderEmail,
      subject: tripName 
        ? `✅ Added to "${tripName}"`
        : `✅ Your ${parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1)} Has Been Added`,
      html: `
        <p>Hi!</p>
        
        <p>Your ${parsed.type} has been added${tripName ? ` to <strong>${tripName}</strong>` : ' to your travel timeline'}.</p>
        
        <p><strong>Details:</strong></p>
        <p>${segmentDescriptions}</p>
        
        ${newSteps.length > 1 ? `<p><em>Added ${newSteps.length} segments to your journey</em></p>` : ''}
        
        <p><a href="https://fwdfwd.com/app" style="display: inline-block; padding: 12px 24px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: 600;">View Your Timeline</a></p>
        
        <p style="margin-top: 24px; font-size: 14px; color: #666;">Keep forwarding your confirmations to <strong>add@fwdfwd.com</strong> to build your timeline!</p>
        
        <p>Thanks,<br>The FWD Team</p>
      `
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email processed and confirmation sent',
      segmentsAdded: newSteps.length,
      duplicatesSkipped: duplicateCount
    });

  } catch (error) {
    console.error('Error processing email:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Helper to format time from ISO string without timezone conversion
function formatTimeFromISO(isoString) {
  if (!isoString) return 'TBD';
  const match = isoString.match(/T(\d{2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return 'TBD';
}

// Helper to format date from ISO string
function formatDateFromISO(isoString) {
  if (!isoString) return 'TBD';
  const match = isoString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(match[1], parseInt(match[2]) - 1, match[3]);
    return `${days[date.getDay()]} ${months[date.getMonth()]} ${parseInt(match[3])}`;
  }
  return 'TBD';
}

// Generate a random share token for trips
function generateShareToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Extract city name from location string (removes airport codes, addresses)
function extractCity(locationStr) {
  if (!locationStr) return null;
  // Remove airport code in parentheses: "San Francisco (SFO)" -> "San Francisco"
  let city = locationStr.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim();
  // Remove trailing airport code: "San Francisco SFO" -> "San Francisco"
  city = city.replace(/\s+[A-Z]{3}$/, '').trim();
  return city || null;
}

// Find or create a matching trip for newly inserted steps
async function findOrCreateTripForSteps(supabase, userId, newSteps, allSteps) {
  if (!newSteps || newSteps.length === 0) return null;

  const MAX_GAP_DAYS = 7; // Maximum days between steps to be same trip
  
  // Get the first new step to determine grouping
  const firstNewStep = newSteps[0];
  const newStepDate = new Date(firstNewStep.start_datetime);
  
  // Check if new step should belong to an existing trip
  // Look at all steps and find ones within 7 days
  const { data: existingTrips } = await supabase
    .from('trips')
    .select('id, name, start_date, end_date')
    .eq('user_id', userId);

  // Check each existing trip to see if new steps fit
  for (const trip of (existingTrips || [])) {
    const tripStart = trip.start_date ? new Date(trip.start_date) : null;
    const tripEnd = trip.end_date ? new Date(trip.end_date) : null;
    
    if (!tripStart) continue;
    
    // Calculate days from trip start/end
    const daysFromStart = (newStepDate - tripStart) / (1000 * 60 * 60 * 24);
    const daysFromEnd = tripEnd ? (newStepDate - tripEnd) / (1000 * 60 * 60 * 24) : daysFromStart;
    
    // If within 7 days before or after the trip, add to this trip
    if (daysFromStart >= -MAX_GAP_DAYS && daysFromEnd <= MAX_GAP_DAYS) {
      // Update the steps to belong to this trip
      const stepIds = newSteps.map(s => s.id);
      await supabase
        .from('travel_steps')
        .update({ trip_id: trip.id })
        .in('id', stepIds);
      
      // Update trip dates if new steps extend the range
      const updates = {};
      const newStepEndDate = newSteps[newSteps.length - 1].end_datetime || newSteps[newSteps.length - 1].start_datetime;
      
      if (newStepDate < tripStart) {
        updates.start_date = firstNewStep.start_datetime.split('T')[0];
      }
      if (tripEnd && new Date(newStepEndDate) > tripEnd) {
        updates.end_date = newStepEndDate.split('T')[0];
      }
      
      if (Object.keys(updates).length > 0) {
        await supabase
          .from('trips')
          .update(updates)
          .eq('id', trip.id);
      }
      
      return { tripId: trip.id, tripName: trip.name };
    }
  }
  
  // No matching trip found - create a new one
  const tripName = generateTripName(newSteps);
  const startDate = firstNewStep.start_datetime.split('T')[0];
  const lastStep = newSteps[newSteps.length - 1];
  const endDate = (lastStep.end_datetime || lastStep.start_datetime).split('T')[0];
  
  const { data: newTrip, error: createError } = await supabase
    .from('trips')
    .insert([{
      user_id: userId,
      name: tripName,
      start_date: startDate,
      end_date: endDate,
      share_token: generateShareToken()
    }])
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating trip:', createError);
    return null;
  }
  
  // Assign new steps to the trip
  const stepIds = newSteps.map(s => s.id);
  await supabase
    .from('travel_steps')
    .update({ trip_id: newTrip.id })
    .in('id', stepIds);
  
  return { tripId: newTrip.id, tripName: newTrip.name };
}

// Generate a trip name based on destinations
function generateTripName(steps) {
  // Get unique destinations
  const destinations = new Set();
  
  for (const step of steps) {
    if (step.type === 'flight' && step.destination_name) {
      const city = extractCity(step.destination_name);
      if (city) destinations.add(city);
    } else if (step.type === 'hotel' && step.origin_name) {
      // For hotels, try to extract city from address or name
      const city = extractCity(step.origin_name);
      if (city) destinations.add(city);
    }
  }
  
  const destArray = Array.from(destinations);
  const startDate = new Date(steps[0].start_datetime);
  const month = startDate.toLocaleString('en-US', { month: 'short' });
  const year = startDate.getFullYear().toString().slice(-2);
  
  if (destArray.length === 0) {
    return `Trip - ${month} '${year}`;
  }
  
  if (destArray.length === 1) {
    return `${destArray[0]} - ${month} '${year}`;
  }
  
  if (destArray.length === 2) {
    return `${destArray[0]} & ${destArray[1]} - ${month} '${year}`;
  }
  
  return `${destArray[0]} + ${destArray.length - 1} more - ${month} '${year}`;
}
