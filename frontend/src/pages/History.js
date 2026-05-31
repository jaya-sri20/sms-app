import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function History() {
  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Message History
        </Typography>
        <Typography>
          This page will show previously sent messages (coming soon).
        </Typography>
      </CardContent>
    </Card>
  );
}
