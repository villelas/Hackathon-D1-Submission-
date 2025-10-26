import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress,
  Paper,
  Alert
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

export const AliasGenerationPage = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user data passed from registration
  const userData = location.state?.userData;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (!userData?.user_id) {
      setError('User data not found. Please register again.');
      return;
    }

    setLoading(true);

    try {
      // Call the generate-alias endpoint
      const response = await axios.post(
        `${API_URL}/users/${userData.user_id}/generate-alias`,
        { description: description }
      );

      const alias = response.data.ai_generated_alias;

      // Update user in localStorage with alias
      const updatedUser = {
        ...userData,
        ai_generated_alias: alias
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (err) {
      console.error('Alias generation error:', err);
      setError(err.response?.data?.detail || 'Failed to generate alias. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        p: 3
      }}>
        <Paper elevation={3} sx={{ 
          p: 5, 
          width: '100%',
          maxWidth: 500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 'bold' }}>
            ✨ One Last Thing
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            Let's generate your AI alias! Describe yourself in one word or phrase.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="description"
              label="Describe yourself in one word"
              name="description"
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., adventurous, chill, energetic, mysterious..."
              helperText="This will be used to generate your unique alias"
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem' }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Generating your alias...
                </>
              ) : (
                'Generate My Alias 🎭'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default AliasGenerationPage;