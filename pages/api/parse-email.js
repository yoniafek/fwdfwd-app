import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
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

    // FIRST: Store the raw email for 30 days
    const { data: storedEmail, error: storeError } = await supabase
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
      console.error('Error storing email:', storeError);
    } else {
      console.log('Stored raw email with ID:', storedEmail.id);
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
      "origin_name": "City Name (ABC)",               // City name with airport code
      "origin_terminal": "3",                          // Terminal if available, null otherwise
      "origin_gate": "A4",                             // Gate if available, null otherwise
      "destination_name": "City Name (XYZ)",          // City name with airport code
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
      "origin_terminal": null,
      "origin_gate": null,
      "destination_name": null,
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
      origin_terminal: segment.origin_terminal || null,
      origin_gate: segment.origin_gate || null,
      destination_name: segment.destination_name,
      destination_terminal: segment.destination_terminal || null,
      destination_gate: segment.destination_gate || null,
      carrier_name: segment.carrier_name,
      confirmation_number: segment.confirmation_number
    }));

    console.log('Inserting', travelSteps.length, 'travel steps');

    const { error: insertError } = await supabase
      .from('travel_steps')
      .insert(travelSteps);

    if (insertError) {
      console.error('Error inserting travel steps:', insertError);
      return res.status(500).json({ error: 'Database error', details: insertError.message });
    }

    console.log('Successfully added travel steps');

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
      subject: `✅ Your ${parsed.type.charAt(0).toUpperCase() + parsed.type.slice(1)} Has Been Added`,
      html: `
        <p>Hi!</p>
        
        <p>Your ${parsed.type} has been added to your travel timeline.</p>
        
        <p><strong>Details:</strong></p>
        <p>${segmentDescriptions}</p>
        
        ${parsed.segments.length > 1 ? `<p><em>Added ${parsed.segments.length} segments to your journey</em></p>` : ''}
        
        <p><a href="https://fwdfwd.com/app" style="display: inline-block; padding: 12px 24px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: 600;">View Your Timeline</a></p>
        
        <p style="margin-top: 24px; font-size: 14px; color: #666;">Keep forwarding your confirmations to <strong>add@fwdfwd.com</strong> to build your timeline!</p>
        
        <p>Thanks,<br>The FWD Team</p>
      `
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Email processed and confirmation sent',
      segmentsAdded: parsed.segments.length
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
