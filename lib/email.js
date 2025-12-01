import { Resend } from 'resend';

let resend = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// Base email sender
async function sendEmail({ to, subject, html }) {
  const { data, error } = await getResend().emails.send({
    from: 'FWD <add@fwdfwd.com>',
    to,
    subject,
    html
  });
  
  if (error) {
    console.error('Resend error:', error);
    throw error;
  }
  
  return data;
}

// Confirmation email for successfully added travel
export async function sendTravelAddedEmail(to, bookingType, segments) {
  const segmentDescriptions = segments.map(seg => {
    if (bookingType === 'flight') {
      const dept = formatDateTime(seg.start_datetime);
      const arr = seg.end_datetime ? formatDateTime(seg.end_datetime) : 'TBD';
      return `${seg.carrier_name}: ${seg.origin_name} → ${seg.destination_name}<br>Departs: ${dept}<br>Arrives: ${arr}`;
    } else if (bookingType === 'hotel') {
      const checkin = formatDate(seg.start_datetime);
      const checkout = seg.end_datetime ? formatDate(seg.end_datetime) : 'TBD';
      return `${seg.origin_name}<br>Check-in: ${checkin}<br>Check-out: ${checkout}`;
    }
    return `${seg.origin_name} → ${seg.destination_name || ''}`;
  }).join('<br><br>');

  const typeLabel = bookingType.charAt(0).toUpperCase() + bookingType.slice(1);

  return sendEmail({
    to,
    subject: `✅ Your ${typeLabel} Has Been Added`,
    html: `
      <p>Hi!</p>
      
      <p>Your ${bookingType} has been added to your travel timeline.</p>
      
      <p><strong>Details:</strong></p>
      <p>${segmentDescriptions}</p>
      
      ${segments.length > 1 ? `<p><em>Added ${segments.length} segments to your journey</em></p>` : ''}
      
      <p><a href="https://fwdfwd.com/app" style="display: inline-block; padding: 12px 24px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: 600;">View Your Timeline</a></p>
      
      <p style="margin-top: 24px; font-size: 14px; color: #666;">Keep forwarding your confirmations to <strong>add@fwdfwd.com</strong> to build your timeline!</p>
      
      <p>Thanks,<br>The FWD Team</p>
    `
  });
}

// Email for parsing failure
export async function sendParsingFailedEmail(to) {
  return sendEmail({
    to,
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
}

// Email for users who don't have an account yet
export async function sendSignupPromptEmail(to, bookingType) {
  return sendEmail({
    to,
    subject: 'Your Travel is Saved – Activate Your Account to View',
    html: `
      <p>Hi there,</p>
      
      <p>We received your ${bookingType} confirmation and saved it for you!</p>
      
      <p><strong>To see your travel timeline:</strong></p>
      <p><a href="https://fwdfwd.com/activate?email=${encodeURIComponent(to)}" style="display: inline-block; padding: 14px 28px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Activate Your Account</a></p>
      
      <p>Your forwarded emails are saved for 30 days. Once you activate, all your travel will appear in your timeline automatically.</p>
      
      <p>Thanks,<br>The FWD Team</p>
    `
  });
}

// Email for magic link login (Phase 1)
export async function sendMagicLinkEmail(to, magicLink) {
  return sendEmail({
    to,
    subject: 'Your FWD Login Link',
    html: `
      <p>Hi!</p>
      
      <p>Click the button below to log in to FWD:</p>
      
      <p><a href="${magicLink}" style="display: inline-block; padding: 14px 28px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Log In to FWD</a></p>
      
      <p style="font-size: 14px; color: #666; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      
      <p>Thanks,<br>The FWD Team</p>
    `
  });
}

// Trip sharing notification
export async function sendTripSharedEmail(to, sharerName, tripName, shareLink) {
  return sendEmail({
    to,
    subject: `${sharerName} shared a trip with you`,
    html: `
      <p>Hi!</p>
      
      <p><strong>${sharerName}</strong> shared their trip "${tripName}" with you.</p>
      
      <p><a href="${shareLink}" style="display: inline-block; padding: 14px 28px; background-color: #1c1917; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">View Trip Details</a></p>
      
      <p style="font-size: 14px; color: #666; margin-top: 24px;">You can see their travel timeline to coordinate pickups and meetups.</p>
      
      <p>Thanks,<br>The FWD Team</p>
    `
  });
}

// Helpers
function formatDateTime(datetime) {
  return new Date(datetime).toLocaleString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit', 
    timeZoneName: 'short' 
  });
}

function formatDate(datetime) {
  return new Date(datetime).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

