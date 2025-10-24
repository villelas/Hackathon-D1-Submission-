import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      <Typography variant="h3" gutterBottom>
        Welcome, {user?.username || 'User'}!
      </Typography>
      <Typography variant="h6" color="textSecondary" paragraph>
        Your BC alias: {user?.alias || 'Generating your alias...'}
      </Typography>
      <Button 
        variant="contained" 
        color="primary" 
        onClick={handleLogout}
        sx={{ mt: 3 }}
      >
        Logout
      </Button>
    </Box>
  );
};

export default Dashboard;
