import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

type ReminderResult =
  | { sent: false }
  | { sent: true; channel: 'whatsapp' | 'sms' };

export async function sendReminder(
  phone: string,
  message: string,
): Promise<ReminderResult> {
  if (!accountSid || !authToken || !phoneNumber || !whatsappNumber) {
    return { sent: false };
  }

  const client = Twilio(accountSid, authToken);

  try {
    await client.messages.create({
      body: message,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${phone}`,
    });
    return { sent: true, channel: 'whatsapp' };
  } catch {
    try {
      await client.messages.create({
        body: message,
        from: phoneNumber,
        to: phone,
      });
      return { sent: true, channel: 'sms' };
    } catch {
      return { sent: false };
    }
  }
}
