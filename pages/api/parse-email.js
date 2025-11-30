import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the incoming email from Cloudflare
    const { from, subject, text, html } = req.body;
    
    if (!from || (!text && !html)) {
      return res.status(400).json({ error: 'Missing required email fields' });
    }

    const emailContent = html || text;
    const senderEmail = from.toLowerCase();

    // Use Claude to parse the email
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are parsing a travel confirmation email. Extract booking details and return ONLY valid JSON.

Email content:
${emailContent}

Extract this information:
- type: "flight", "hotel", "car", "train", or "bus" (or "unknown" if unclear)
- segments: array of travel segments (for flights with layovers, create separate segments)
  Each segment should have:
  - start_datetime: ISO 8601 format
  - end_datetime: ISO 8601 format (if applicable)
  - origin_name: departure location/hotel name
  - destination_name: arrival location (null for hotels)
  - carrier_name: airline/hotel/company name
  - confirmation_number: booking reference

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no code blocks.

Example for multi-segment flight:
{
  "type": "flight",
  "segments": [
    {
      "start_datetime": "2025-12-01T14:00:00Z",
      "end_datetime": null,
      "origin_name": "San Francisco (SFO)",
      "destination_name": "Chicago (ORD)",
      "carrier_name": "United Airlines UA 1234",
      "confirmation_number": "ABC123"
    },
    {
      "start_datetime": "2025-12-01T18:30:00Z",
      "end_datetime": null,
      "origin_name": "Chicago (ORD)",
      "destination_name": "New York (JFK)",
      "carrier_name": "United Airlines UA 5678",
      "confirmation_number": "ABC123"
    }
  ]
}

If you cannot extract valid booking details, return:
{ "type": "unknown", "segments": [] }`
      }]
    });

    const responseText = message.content[0].text;
    let parsed;
    
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Failed to parse Claude response');
      }
    }

    // Check if parsing was successful
    if (parsed.type === 'unknown' || !parsed.segments || parsed.segments.length === 0) {
      // Send error email (placeholder for now)
      console.log(`Would send error email to ${senderEmail}`);

      return res.status(200).json({ 
        success: false, 
        message: 'Could not parse email' 
      });
    }

    // Look up user by email in auth.users using RPC function
    // First, we need to check if user exists by trying to query their travel steps
    // If they have an account, we'll get their user ID from the auth context
    
    // Get user ID by checking auth.users via a custom query
    const { data: authUsers, error: authError } = await supabase.rpc('get_user_id_by_email', {
      user_email: senderEmail
    });

    let userId;
    let isNewUser = false;

    if (authUsers && authUsers.length > 0) {
      // Existing auth user
      userId = authUsers[0].id;
      isNewUser = false;
    } else {
      // New user - create a pending profile
      // But we need an auth user ID, so we'll create a placeholder
      // For now, we'll just use the email as a temporary identifier
      // and the user will need to sign up to claim their bookings
      
      // Create pending profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert([{ 
          email: senderEmail,
          pending: true 
        }])
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return res.status(500).json({ error: 'Database error' });
      }

      userId = newProfile.id;
      isNewUser = true;
    }

    // Add all segments to timeline
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

    const { error: insertError } = await supabase
      .from('travel_steps')
      .insert(travelSteps);

    if (insertError) {
      console.error('Error inserting travel steps:', insertError);
      return res.status(500).json({ error: 'Database error', details: insertError.message });
    }

    // Send confirmation email (placeholder)
    console.log(`Would send confirmation email to ${senderEmail}`);
    console.log(`Added ${travelSteps.length} travel segment(s)`);

    return res.status(200).json({ 
      success: true, 
      message: 'Email processed successfully',
      isNewUser,
      segmentsAdded: parsed.segments.length
    });

  } catch (error) {
    console.error('Error processing email:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}