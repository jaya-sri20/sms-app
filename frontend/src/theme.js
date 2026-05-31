import { createTheme } from '@mui/material/styles';

export const getAppTheme = (mode = 'light') =>
  createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#2563eb' : '#90caf9',
      },
      secondary: {
        main: mode === 'light' ? '#9333ea' : '#ce93d8',
      },
      background: {
        default: mode === 'light' ? '#f5f5f5' : '#121212',
        paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
      },
    },
    typography: {
      fontFamily: 'Inter, Roboto, sans-serif',
      h4: {
        fontWeight: 700,
      },
    },
    shape: {
      borderRadius: 10,
    },
  });
