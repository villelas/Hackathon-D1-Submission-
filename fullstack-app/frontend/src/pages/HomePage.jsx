import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlassCard from '../components/ui/GlassCard';
import { neonText } from '../styles/theme';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Box sx={{ textAlign: 'center', mb: 6 }}>
      <Typography variant="h1" gutterBottom>
        Welcome to BCPlugHub
      </Typography>
      <Typography variant="h5" color="textSecondary" gutterBottom>
        Your exclusive platform for BC function invites
      </Typography>

      <Box sx={{ 
        display: 'grid', 
        gap: 4, 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
        maxWidth: '1200px', 
        mx: 'auto',
        mt: 6
      }}>
        <GlassCard>
          <Typography variant="h4" sx={{ mb: 2, ...neonText }}>Create Events</Typography>
          <Typography sx={{ mb: 3 }}>
            Manage your BC functions undercover with AI-generated aliases.
          </Typography>
        </GlassCard>

        <GlassCard>
          <Typography variant="h4" sx={{ mb: 2, ...neonText }}>Join Functions Tonight</Typography>
          <Typography sx={{ mb: 3 }}>
            Receive and accept invites with your unique BC alias. Keep your identity private. Let's share the BC community.
          </Typography>
        </GlassCard>
      </Box>
    </Box>
  );
};

export default HomePage;
