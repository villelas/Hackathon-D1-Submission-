import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  CircularProgress,
  Paper,
  Avatar,
  Divider,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

export const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.email || !formData.email.endsWith('@bc.edu')) {
      setError('Please use a valid BC email address');
      return;
    }
    
    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    console.log('Attempting login with:', { email: formData.email });
    
    try {
      const result = await login(formData.email, formData.password);
      console.log('Login result:', result);
      
      if (!result.success) {
        const errorMsg = result.message || 'Failed to login. Please check your credentials.';
        console.error('Login failed:', errorMsg);
        setError(errorMsg);
      } else {
        console.log('Login successful, user:', result.user);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'An unexpected error occurred. Please try again.';
      console.error('Login error:', {
        message: errorMsg,
        status: err.response?.status,
        data: err.response?.data,
        stack: err.stack
      });
      setError(errorMsg);
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
          p: 4, 
          width: '100%',
          maxWidth: 450,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
            <LockOutlinedIcon />
          </Avatar>
          
          <Typography component="h1" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            Sign in to BCPlugHub
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="BC Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              placeholder="username@bc.edu"
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ py: 1.5, fontSize: '1rem', mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ textDecoration: 'none' }}>
                  Sign up
                </Link>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Use your BC email to sign in
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </MainLayout>
  );
};

export default LoginPage;
