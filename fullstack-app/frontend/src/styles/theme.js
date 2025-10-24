import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#39FF14', // Neon Green
      contrastText: '#000',
    },
    secondary: {
      main: '#1a1a1a',
    },
    background: {
      default: '#0a0a0a',
      paper: 'rgba(26, 26, 26, 0.8)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#39FF14',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '25px',
          textTransform: 'none',
          fontWeight: 'bold',
          padding: '10px 24px',
          boxShadow: '0 0 15px rgba(57, 255, 20, 0.3)',
          '&:hover': {
            boxShadow: '0 0 20px rgba(57, 255, 20, 0.6)',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      background: 'linear-gradient(45deg, #39FF14 30%, #00ff88 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontWeight: 600,
      color: '#39FF14',
    },
  },
});

export const glassMorphism = {
  background: 'rgba(26, 26, 26, 0.25)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(57, 255, 20, 0.18)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  borderRadius: '16px',
};

export const neonText = {
  textShadow: '0 0 5px #39FF14, 0 0 10px #39FF14, 0 0 15px #39FF14',
};

export const pulseAnimation = {
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(57, 255, 20, 0.7)',
    },
    '70%': {
      boxShadow: '0 0 0 10px rgba(57, 255, 20, 0)',
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(57, 255, 20, 0)',
    },
  },
};
