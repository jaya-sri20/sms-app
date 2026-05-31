import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

export default function Dashboard() {
  return (
    <Card elevation={3}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Welcome to your SMS Dashboard
        </Typography>
        <Typography>
          Use the sidebar to send messages or view your history.
        </Typography>
      </CardContent>
    </Card>
  );
}
