import React from 'react';
import { ThemeProvider, CssBaseline, Box, Typography, Button } from '@mui/material';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { theme } from './styles/theme';
import MainLayout from './components/layout/MainLayout';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './pages/Dashboard';
import { useAuth } from './contexts/AuthContext';
import GlassCard from './components/ui/GlassCard';
import { neonText } from './styles/theme';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Public Route component
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/dashboard" />;
};

// Home component
const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h1" gutterBottom>
          Welcome to BCPlugHub
        </Typography>
        <Typography variant="h5" color="textSecondary" gutterBottom>
          Your exclusive platform for BC function invites
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, maxWidth: '1200px', mx: 'auto' }}>
        <GlassCard>
          <Typography variant="h4" sx={{ mb: 2, ...neonText }}>Create Events</Typography>
          <Typography sx={{ mb: 3 }}>
            Manage your BC functions undercover with AI-generated aliases.
          </Typography>
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => navigate(user ? '/dashboard' : '/login')}
          >
            {user ? 'Go to Dashboard' : 'Get Started'}
          </Button>
        </GlassCard>

        <GlassCard>
          <Typography variant="h4" sx={{ mb: 2, ...neonText }}>Join Functions Tonight</Typography>
          <Typography sx={{ mb: 3 }}>
            Receive and accept invites with your unique BC alias. Keep your identity private. Let's share the BC community.
          </Typography>
          <Button 
            variant="outlined" 
            color="primary" 
            sx={{ borderWidth: '2px' }}
            onClick={() => navigate(user ? '/dashboard' : '/login')}
          >
            {user ? 'View Invites' : 'Login to Continue'}
          </Button>
        </GlassCard>
      </Box>
    </MainLayout>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <MainLayout>
                <LoginForm />
              </MainLayout>
            </PublicRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;