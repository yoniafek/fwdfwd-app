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
      // Continue processing even if storage fails
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

CRITICAL INSTRUCTIONS:
1. Extract EXACT times from the email - do not invent or approximate
2. For flights: extract departure AND arrival times for each segment
3. Include flight numbers in carrier_name (e.g., "United Airlines UA 1234")
4. Use ISO 8601 format with timezone if available, or use UTC if timezone is unclear
5. For multi-leg flights, create separate segments for EACH flight
6. Return ONLY valid JSON with no markdown, explanations, or code blocks

Extract this information:
{
  "type": "flight" | "hotel" | "car" | "train" | "bus" | "unknown",
  "segments": [
    {
      "start_datetime": "YYYY-MM-DDTHH:MM:SSZ",  // Exact departure/check-in time
      "end_datetime": "YYYY-MM-DDTHH:MM:SSZ",    // Exact arrival/check-out time (REQUIRED for flights)
      "origin_name": "City/Airport Code",         // e.g., "Newark (EWR)"
      "destination_name": "City/Airport Code",    // e.g., "Los Angeles (LAX)"
      "carrier_name": "Airline/Hotel with Number", // e.g., "United Airlines UA 1234"
      "confirmation_number": "XXXXXX"
    }
  ]
}

EXAMPLES:

Flight with layover:
{
  "type": "flight",
  "segments": [
    {
      "start_datetime": "2025-12-15T08:00:00-05:00",
      "end_datetime": "2025-12-15T11:30:00-06:00",
      "origin_name": "Newark (EWR)",
      "destination_name": "Chicago (ORD)",
      "carrier_name": "United Airlines UA 1234",
      "confirmation_number": "ABC123"
    },
    {
      "start_datetime": "2025-12-15T14:00:00-06:00",
      "end_datetime": "2025-12-15T16:45:00-08:00",
      "origin_name": "Chicago (ORD)",
      "destination_name": "Los Angeles (LAX)",
      "carrier_name": "United Airlines UA 5678",
      "confirmation_number": "ABC123"
    }
  ]
}

Hotel:
{
  "type": "hotel",
  "segments": [
    {
      "start_datetime": "2025-12-20T15:00:00-05:00",
      "end_datetime": "2025-12-23T11:00:00-05:00",
      "origin_name": "Marriott Downtown NYC",
      "destination_name": null,
      "carrier_name": "Marriott",
      "confirmation_number": "XYZ789"
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
        
        // Update stored email with error
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

    // Add segments to timeline
    const travelSteps = parsed.segments.map(segment => ({
      user_id: userId,
      type: parsed.type,
      start_datetime: segment.start_datetime,
      end_datetime: segment.end_datetime,
      origin_name: segment.origin_name,
      destination_name: segment.destination_name,
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

    // Format segments for email
    const segmentDescriptions = parsed.segments.map(seg => {
      if (parsed.type === 'flight') {
        const dept = new Date(seg.start_datetime).toLocaleString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', 
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
        });
        const arr = seg.end_datetime ? new Date(seg.end_datetime).toLocaleString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', 
          hour: 'numeric', minute: '2-digit', timeZoneName: 'short' 
        }) : 'TBD';
        return `${seg.carrier_name}: ${seg.origin_name} → ${seg.destination_name}<br>Departs: ${dept}<br>Arrives: ${arr}`;
      } else if (parsed.type === 'hotel') {
        const checkin = new Date(seg.start_datetime).toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric' 
        });
        const checkout = seg.end_datetime ? new Date(seg.end_datetime).toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric' 
        }) : 'TBD';
        return `${seg.origin_name}<br>Check-in: ${checkin}<br>Check-out: ${checkout}`;
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
        
        <p><a href="https://fwdfwd.com/app" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Your Timeline</a></p>
        
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