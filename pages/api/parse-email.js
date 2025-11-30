import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create Supabase client with service role for admin access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

If you cannot extract valid booking details, return:
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
        throw new Error('Failed to parse Claude response');
      }
    }

    if (parsed.type === 'unknown' || !parsed.segments || parsed.segments.length === 0) {
      console.log('Could not parse email');
      return res.status(200).json({ 
        success: false, 
        message: 'Could not parse email' 
      });
    }

    console.log('Parsed travel type:', parsed.type, 'Segments:', parsed.segments.length);

    // Look up user by email using RPC
    const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      user_email: senderEmail
    });

    console.log('RPC result - userId:', userId, 'error:', rpcError);

    if (!userId) {
      console.log('User not found for email:', senderEmail);
      return res.status(200).json({
        success: false,
        message: 'User not found. Please sign up first at fwdfwd.com/app'
      });
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

    console.log('Inserting travel steps:', travelSteps);

    const { error: insertError } = await supabase
      .from('travel_steps')
      .insert(travelSteps);

    if (insertError) {
      console.error('Error inserting travel steps:', insertError);
      return res.status(500).json({ error: 'Database error', details: insertError.message });
    }

    console.log('Successfully added', travelSteps.length, 'travel segment(s)');

    return res.status(200).json({ 
      success: true, 
      message: 'Email processed successfully',
      segmentsAdded: parsed.segments.length
    });

  } catch (error) {
    console.error('Error processing email:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}