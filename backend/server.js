const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

let client;
function getTwilioClient() {
  if (client) return client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith('AC')) {
    throw new Error(
      'Twilio is not configured. Set TWILIO_ACCOUNT_SID (must start with "AC"), TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in backend/.env'
    );
  }
  client = twilio(sid, token);
  return client;
}

/* ⭐ NEW: Test SMS Route */
app.post('/api/send-test-sms', async (req, res) => {
  const { message, testNumber } = req.body;

  if (!message || !testNumber) {
    return res.status(400).json({ error: 'Message and test number required' });
  }

  let twilioClient;
  try {
    twilioClient = getTwilioClient();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  try {
    const msg = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: testNumber,
    });

    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ⭐ Existing Bulk SMS Route */
app.post('/api/send-sms', async (req, res) => {
  const { message, phoneNumbers } = req.body;

  if (!message || !phoneNumbers) {
    return res.status(400).json({ error: 'Message and phone numbers required' });
  }

  let twilioClient;
  try {
    twilioClient = getTwilioClient();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) {
    return res.status(500).json({ error: 'TWILIO_FROM_NUMBER not configured' });
  }

  // Verify the from number is valid and active
  try {
    const phoneNumber = await twilioClient.incomingPhoneNumbers.list({
      phoneNumber: fromNumber,
      limit: 1,
    });

    if (phoneNumber.length === 0) {
      return res.status(400).json({
        error: `Sender number ${fromNumber} is not registered in your Twilio account. Please verify it in Twilio Console.`,
      });
    }
  } catch (err) {
    console.warn('Could not verify phone number:', err.message);
    // Continue anyway, let Twilio catch the error
  }

  const numbers = phoneNumbers
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const results = [];

  for (const to of numbers) {
    try {
      const msg = await twilioClient.messages.create({
        body: message,
        from: fromNumber,
        to,
      });

      console.log(`Message created for ${to}: SID=${msg.sid}`);

      // Check message status after a delay to catch validation errors
      await new Promise((resolve) => setTimeout(resolve, 1000));

      try {
        const status = await twilioClient.messages(msg.sid).fetch();
        console.log(`Message status for ${to}:`, {
          sid: status.sid,
          status: status.status,
          errorCode: status.errorCode,
          errorMessage: status.errorMessage,
          priceUnit: status.priceUnit,
          accountSid: status.accountSid,
        });

        if (
          status.errorCode &&
          status.errorCode !== null &&
          status.errorCode !== undefined
        ) {
          results.push({
            to,
            status: 'failed',
            error: `Twilio Error ${status.errorCode}: ${status.errorMessage || 'Unknown error'}`,
            sid: msg.sid,
          });
        } else if (status.status === 'failed' || status.status === 'undelivered') {
          results.push({
            to,
            status: 'failed',
            error: `Message delivery failed (Status: ${status.status})`,
            sid: msg.sid,
          });
        } else {
          results.push({ to, status: 'sent', sid: msg.sid });
        }
      } catch (statusErr) {
        console.error(`Error fetching status for ${to}:`, statusErr.message);
        // If we can't fetch status, assume it was sent
        results.push({ to, status: 'sent', sid: msg.sid });
      }
    } catch (err) {
      console.error(`Error creating message for ${to}:`, err.message);
      results.push({ to, status: 'failed', error: err.message });
    }
  }

  // Check if all messages failed
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const successCount = results.filter((r) => r.status === 'sent').length;

  // Return 400 if all failed, 207 if partial, 200 if all succeeded
  const statusCode =
    failedCount === results.length ? 400 : successCount === results.length ? 200 : 207;

  res.status(statusCode).json({
    success: successCount > 0,
    successCount,
    failedCount,
    results,
  });
});

const PORT = Number(process.env.PORT) || 4000;
const server = app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
