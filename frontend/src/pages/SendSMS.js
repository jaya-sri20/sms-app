import React, { useState } from 'react';
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
// Use simple emoji markers instead of importing MUI icon package

export default function SendSMS() {
  const [message, setMessage] = useState('');
  const [numbers, setNumbers] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  // normalize and validate phone numbers; defaultCountry should be in '+1' form
  function normalizeAndValidate(csv, defaultCountry = '+1') {
    const tokens = csv.split(',').map((s) => s.trim()).filter(Boolean);
    const valid = [];
    const invalid = [];
    const e164 = /^\+[1-9]\d{6,14}$/; // min 7 digits after country

    for (const raw of tokens) {
      let s = raw.replace(/\s+/g, '');

      if (!s) continue;

      if ((s.match(/\+/g) || []).length > 1) {
        invalid.push({ raw, reason: 'multiple + signs' });
        continue;
      }

      if (s.startsWith('00')) s = '+' + s.slice(2);

      if (s.startsWith('+')) {
        s = '+' + s.slice(1).replace(/[^0-9]/g, '');
      } else {
        const digitsOnly = s.replace(/[^0-9]/g, '');
        if (!digitsOnly) {
          invalid.push({ raw, reason: 'no digits found' });
          continue;
        }

        if (!defaultCountry) {
          invalid.push({ raw, reason: 'missing country code; provide E.164 or set a default country' });
          continue;
        }

        const cleaned = digitsOnly.replace(/^0+/, '');
        const dc = defaultCountry.startsWith('+') ? defaultCountry : '+' + defaultCountry.replace(/^\+/, '');
        s = dc + cleaned;
      }

      if (!/^\+[0-9]+$/.test(s)) {
        invalid.push({ raw, reason: `invalid characters after normalization (${s})` });
        continue;
      }

      const digits = s.slice(1);
      if (digits.length < 7) {
        invalid.push({ raw, reason: `too short after normalization (${s})` });
        continue;
      }
      if (digits.length > 15) {
        invalid.push({ raw, reason: `too long after normalization (${s})` });
        continue;
      }

      if (!e164.test(s)) {
        invalid.push({ raw, reason: `does not match E.164 (${s})` });
        continue;
      }

      valid.push(s);
    }

    return { valid, invalid };
  }

  const resetForm = () => {
    setMessage('');
    setNumbers('');
    setResult(null);
    setError('');
    setShowRawJson(false);
  };

  const sendSMS = async () => {
    setError('');
    setResult(null);

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    if (!numbers.trim()) {
      setError('At least one phone number is required');
      return;
    }

    setLoading(true);

    // normalize + validate before sending (default country +1)
    const { valid, invalid } = normalizeAndValidate(numbers, '+1');

    let clientSideInvalid;
    if (invalid.length > 0) {
      clientSideInvalid = invalid.map((i) => ({ to: i.raw, status: 'invalid_format', error: i.reason }));
      if (valid.length === 0) {
        setResult({ results: clientSideInvalid });
        setLoading(false);
        setError('No valid phone numbers to send. See list for corrections.');
        return;
      }
    }

    // deduplicate valid numbers and track duplicates
    const seen = new Set();
    const unique = [];
    const duplicates = [];
    for (const num of valid) {
      if (seen.has(num)) {
        duplicates.push({ to: num, status: 'duplicate', error: 'This number was already in the list' });
      } else {
        seen.add(num);
        unique.push(num);
      }
    }

    if (unique.length === 0) {
      const allNonSent = [...(clientSideInvalid || []), ...duplicates];
      setResult({ results: allNonSent });
      setLoading(false);
      setError('No unique valid phone numbers to send. See list for corrections.');
      return;
    }

    let clientSideRejects = [...(clientSideInvalid || []), ...duplicates];

    try {
      const res = await fetch('http://localhost:4000/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          phoneNumbers: unique.join(','),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send messages');
      } else {
        const combined = Array.isArray(data.results) ? data.results.slice() : [];
        if (clientSideRejects.length > 0) combined.push(...clientSideRejects);
        setResult({ results: combined });
      }
    } catch (err) {
      setError('Network or server error');
      if (clientSideRejects.length > 0) setResult({ results: clientSideRejects });
    }

    setLoading(false);
  };

  return (
    <Card elevation={4}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Send SMS
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Message"
          multiline
          rows={4}
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          label="Phone Numbers (comma separated)"
          multiline
          rows={3}
          fullWidth
          value={numbers}
          onChange={(e) => setNumbers(e.target.value)}
          placeholder="+15551234567, +15557654321"
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Recommendations: use E.164 format (eg +15551234567). Numbers may be comma-separated. If a number lacks a country code it will default to +1. Avoid parentheses, dashes, or letters; leading 00 is converted to +.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={sendSMS}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Messages'}
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={resetForm}
            disabled={loading}
          >
            Reset
          </Button>
        </Box>

        {result && result.results && (
          <Card sx={{ mt: 3, p: 2, background: 'rgba(0,0,0,0.04)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Results</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                {showRawJson ? 'Show Formatted' : 'Show Raw JSON'}
              </Button>
            </Box>

            {showRawJson ? (
              <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <Box>
            {/* categorize results */}
            {(() => {
              const success = result.results.filter((r) => r.status === 'sent' || r.status === 'success');
              const failed = result.results.filter((r) => !(r.status === 'sent' || r.status === 'success'));

              return (
                <Box>
                  <Typography variant="subtitle1" sx={{ mt: 1 }}>Successfully sent to these numbers ({success.length})</Typography>
                  {success.length === 0 ? (
                    <Typography color="text.secondary">No successful deliveries</Typography>
                  ) : (
                    <List dense>
                      {success.map((row, idx) => (
                        <ListItem key={row.to || idx}>
                            <ListItemIcon>
                              <span style={{ color: 'green', fontSize: 20 }}>✓</span>
                            </ListItemIcon>
                          <ListItemText primary={row.to} secondary={row.sid ? `sid: ${row.sid}` : `status: ${row.status}`} />
                        </ListItem>
                      ))}
                    </List>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Typography variant="subtitle1">Not successfully sent to these numbers ({failed.length})</Typography>
                  {failed.length === 0 ? (
                    <Typography color="text.secondary">No failures</Typography>
                  ) : (
                    <List dense>
                      {failed.map((row, idx) => (
                        <ListItem key={row.to || idx}>
                          <ListItemIcon>
                            <span style={{ color: 'red', fontSize: 20 }}>✖</span>
                          </ListItemIcon>
                          <ListItemText
                            primary={row.to}
                            secondary={row.error ? `${row.error} (status: ${row.status})` : `status: ${row.status}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              );
            })()}
              </Box>
            )}

          </Card>
        )}
      </CardContent>
    </Card>
  );
}
