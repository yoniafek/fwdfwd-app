import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userEmail = 'yoni08@gmail.com' } = req.body;

  try {
    console.log('Starting reparse for user:', userEmail);

    // Find the user by email using the RPC function
    const { data: userId, error: rpcError } = await supabase.rpc('get_user_id_by_email', {
      user_email: userEmail
    });

    if (rpcError || !userId) {
      return res.status(404).json({ error: 'User not found', details: rpcError?.message });
    }

    console.log('Found user ID:', userId);

    // Get all raw emails for this user that have been processed
    const { data: rawEmails, error: emailsError } = await supabase
      .from('raw_emails')
      .select('*')
      .eq('sender_email', userEmail)
      .eq('processed', true);

    if (emailsError) {
      return res.status(500).json({ error: 'Failed to fetch emails', details: emailsError.message });
    }

    console.log(`Found ${rawEmails?.length || 0} raw emails to reparse`);

    if (!rawEmails || rawEmails.length === 0) {
      return res.status(200).json({ 
        message: 'No emails to reparse',
        reparsed: 0 
      });
    }

    let reparsedCount = 0;
    let updatedSteps = [];
    let errors = [];

    for (const email of rawEmails) {
      try {
        const emailContent = email.html_content || email.text_content;
        if (!emailContent) {
          errors.push({ emailId: email.id, error: 'No content' });
          continue;
        }

        console.log(`Reparsing email ${email.id}: ${email.subject}`);

        // Re-parse with Claude using the same prompt from parse-email.js
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
6. Japan Standard Time: +09:00
7. If timezone is unclear, infer from airport/city location

EXTRACTION INSTRUCTIONS:
1. Extract EXACT times from the email - do not invent or approximate
2. For flights: extract departure AND arrival times (both in LOCAL time at their respective locations)
3. Include airline + flight number in carrier_name (e.g., "United • UA 1234")
4. Extract terminal and gate if available
5. For multi-leg flights, create separate segments for EACH flight
6. Return ONLY valid JSON with no markdown, explanations, or code blocks

Extract this information:
{
  "type": "flight" | "hotel" | "car" | "train" | "bus" | "unknown",
  "segments": [
    {
      "start_datetime": "YYYY-MM-DDTHH:MM:SS-08:00",
      "end_datetime": "YYYY-MM-DDTHH:MM:SS+09:00",
      "origin_name": "City Name (ABC)",
      "origin_address": "123 Main St, City, State ZIP",
      "origin_terminal": "3",
      "origin_gate": "A4",
      "destination_name": "City Name (XYZ)",
      "destination_address": null,
      "destination_terminal": "A",
      "destination_gate": null,
      "carrier_name": "Airline • XX 1234",
      "confirmation_number": "XXXXXX"
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
            errors.push({ emailId: email.id, error: 'Failed to parse response' });
            continue;
          }
        }

        if (parsed.type === 'unknown' || !parsed.segments?.length) {
          errors.push({ emailId: email.id, error: 'No segments parsed' });
          continue;
        }

        // Update the raw_email with new parsed data
        await supabase
          .from('raw_emails')
          .update({ parsed_data: parsed })
          .eq('id', email.id);

        // Now find and update the corresponding travel_steps
        // Match by confirmation number if available
        for (const segment of parsed.segments) {
          if (!segment.confirmation_number) continue;

          // Find matching travel_step by confirmation number and user
          const { data: existingStep, error: stepError } = await supabase
            .from('travel_steps')
            .select('*')
            .eq('user_id', userId)
            .eq('confirmation_number', segment.confirmation_number)
            .single();

          if (stepError || !existingStep) {
            console.log(`No matching step found for confirmation ${segment.confirmation_number}`);
            continue;
          }

          // Update the step with new times (preserving timezone offsets)
          const { data: updated, error: updateError } = await supabase
            .from('travel_steps')
            .update({
              start_datetime: segment.start_datetime,
              end_datetime: segment.end_datetime
            })
            .eq('id', existingStep.id)
            .select()
            .single();

          if (updateError) {
            errors.push({ stepId: existingStep.id, error: updateError.message });
          } else {
            updatedSteps.push({
              id: updated.id,
              confirmation: segment.confirmation_number,
              oldStart: existingStep.start_datetime,
              newStart: segment.start_datetime,
              oldEnd: existingStep.end_datetime,
              newEnd: segment.end_datetime
            });
          }
        }

        reparsedCount++;

      } catch (parseError) {
        errors.push({ emailId: email.id, error: parseError.message });
      }
    }

    return res.status(200).json({
      success: true,
      reparsed: reparsedCount,
      updatedSteps: updatedSteps.length,
      updates: updatedSteps,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Reparse error:', error);
    return res.status(500).json({ error: 'Reparse failed', details: error.message });
  }
}

