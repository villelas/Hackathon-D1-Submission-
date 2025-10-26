// GoatedPrediction.jsx - Black Glassmorphism Design
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Card,
  CardContent,
  CardMedia,
  Typography, 
  Button,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Dialog,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const API_URL = 'http://127.0.0.1:8000/api';

function GoatedPrediction() {
  const navigate = useNavigate();
  const [goatedEvent, setGoatedEvent] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  useEffect(() => {
    fetchGoatedPrediction();
  }, []);

  const fetchGoatedPrediction = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(`${API_URL}/goated-prediction`);
      
      if (response.data.goated_event) {
        setGoatedEvent(response.data.goated_event);
        setPrediction(response.data.prediction);
      } else {
        setError(response.data.message || 'No goated event found');
      }
    } catch (err) {
      console.error('Error fetching goated prediction:', err);
      setError('Failed to fetch goated prediction');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#00ff88';
    if (score >= 60) return '#ffd93d';
    return '#ff6b9d';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)';
    if (score >= 60) return 'linear-gradient(135deg, #ffd93d 0%, #ff9a00 100%)';
    return 'linear-gradient(135deg, #ff6b9d 0%, #ff3366 100%)';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'High') return '#00ff88';
    if (confidence === 'Medium') return '#ffd93d';
    return '#ff6b9d';
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={80} sx={{ color: '#00ff88', mb: 3 }} />
          <Typography variant="h5" sx={{ color: '#00ff88', fontWeight: 600 }}>
            🎓 Training AI model on 500+ BC events...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              borderRadius: 4,
              p: 4,
              textAlign: 'center'
            }}
          >
            <Typography variant="h5" sx={{ color: '#ff6b9d', mb: 2, fontWeight: 700 }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              onClick={fetchGoatedPrediction}
              sx={{ 
                mt: 2,
                background: 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00d4aa 0%, #00ff88 100%)',
                }
              }}
            >
              Try Again
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  if (!goatedEvent) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="h5" sx={{ color: '#00ff88' }}>
          No events in the next 10 days to predict!
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#000000',
        py: 6,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.2) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-30px)' }
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Back Button */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            color: 'white',
            mb: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          Back to Dashboard
        </Button>

        {/* Header */}
        <Box sx={{ mb: 5, textAlign: 'center' }}>
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            <EmojiEventsIcon sx={{ fontSize: 56, color: '#ffd93d', mr: 2, filter: 'drop-shadow(0 0 20px rgba(255, 217, 61, 0.5))' }} />
            <Typography 
              variant="h2" 
              component="h1" 
              fontWeight="800"
              sx={{
                color: '#00ff88',
                textShadow: '0 0 40px rgba(0, 255, 136, 0.6), 0 0 20px rgba(0, 255, 136, 0.4)'
              }}
            >
              Highlighted Function
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
            Our ML model predicts this will be the most successful event in the next 10 days
          </Typography>
        </Box>

        {/* Main Content */}
        <Grid container spacing={4} justifyContent="center">
          {/* Center - Event Image */}
          <Grid item xs={12} md={8}>
            {goatedEvent.invitation_image && (
              <Card 
                elevation={0}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  mb: 4,
                  background: 'rgba(0, 0, 0, 0.4)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 20px 60px rgba(0, 255, 136, 0.3)',
                    border: '1px solid rgba(0, 255, 136, 0.5)',
                  }
                }}
                onClick={() => setImageDialogOpen(true)}
              >
                <CardMedia
                  component="img"
                  image={goatedEvent.invitation_image}
                  alt={goatedEvent.function_name}
                  sx={{ 
                    width: '100%',
                    height: 'auto',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    borderRadius: 3,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                  <Typography variant="body2" fontWeight="600">
                    Click to enlarge
                  </Typography>
                </Box>
              </Card>
            )}

            {/* Event Details - Black Glassmorphism */}
            <Card 
              elevation={0}
              sx={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              }}
            >
              <CardContent sx={{ p: 5 }}>
                <Box display="flex" alignItems="center" justifyContent="center" mb={3}>
                  <Typography 
                    variant="h3" 
                    component="h2" 
                    fontWeight="800"
                    sx={{ 
                      color: 'white',
                      textAlign: 'center',
                      textShadow: '0 2px 20px rgba(0, 255, 136, 0.5)'
                    }}
                  >
                    {goatedEvent.emoji_vibe?.join(' ')} {goatedEvent.function_name}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="center" gap={1} mb={4}>
                  <Chip 
                    label={`by ${goatedEvent.organizer_alias}`} 
                    sx={{ 
                      background: 'rgba(0, 255, 136, 0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(0, 255, 136, 0.5)',
                      color: '#00ff88',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      px: 2
                    }} 
                  />
                  {goatedEvent.club_affiliated && goatedEvent.club_name && (
                    <Chip 
                      label={`🛡️ ${goatedEvent.club_name}`}
                      sx={{ 
                        background: 'rgba(255, 217, 61, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 217, 61, 0.5)',
                        color: '#ffd93d',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        px: 2
                      }} 
                    />
                  )}
                </Box>

                <Divider sx={{ my: 4, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box 
                      display="flex" 
                      alignItems="center" 
                      sx={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <CalendarTodayIcon sx={{ mr: 2, color: '#00ff88', fontSize: 28 }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mb: 0.5 }}>
                          Date & Time
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: 'white' }}>
                          {formatDate(goatedEvent.date)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box 
                      display="flex" 
                      alignItems="center"
                      sx={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <LocationOnIcon sx={{ mr: 2, color: '#ffd93d', fontSize: 28 }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mb: 0.5 }}>
                          Location
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: 'white' }}>
                          {goatedEvent.location}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Box 
                      display="flex" 
                      alignItems="center"
                      sx={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        p: 2.5,
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <PeopleIcon sx={{ mr: 2, color: '#00ff88', fontSize: 28 }} />
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block', mb: 0.5 }}>
                          Maximum Capacity
                        </Typography>
                        <Typography variant="body1" fontWeight={600} sx={{ color: 'white' }}>
                          {goatedEvent.max_capacity} people
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Right side - AI Predictions */}
          <Grid item xs={12} md={4}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 4,
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                position: 'sticky',
                top: 20
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box textAlign="center" mb={4}>
                  <Typography 
                    variant="h5" 
                    fontWeight="800" 
                    sx={{ 
                      color: 'white',
                      mb: 1,
                      textShadow: '0 2px 10px rgba(0, 255, 136, 0.5)'
                    }}
                  >
                    🤖 AI Prediction
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Powered by machine learning
                  </Typography>
                </Box>

                {/* Goated Score */}
                <Box mb={4}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                      Goated Score
                    </Typography>
                    <Typography 
                      variant="h4" 
                      fontWeight="800"
                      sx={{
                        color: getScoreColor(prediction.goated_score),
                        filter: `drop-shadow(0 0 10px ${getScoreColor(prediction.goated_score)})`
                      }}
                    >
                      {prediction.goated_score}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 16,
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.1)',
                      overflow: 'hidden',
                      position: 'relative'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${prediction.goated_score}%`,
                        background: getScoreGradient(prediction.goated_score),
                        borderRadius: 8,
                        boxShadow: `0 0 20px ${getScoreColor(prediction.goated_score)}`,
                        transition: 'width 1s ease-out'
                      }}
                    />
                  </Box>
                </Box>

                {/* Predicted RSVPs */}
                <Box 
                  mb={4}
                  sx={{
                    background: 'rgba(0, 255, 136, 0.1)',
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(0, 255, 136, 0.3)'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                      Predicted RSVPs
                    </Typography>
                    <Typography 
                      variant="h5" 
                      fontWeight="800" 
                      sx={{ 
                        color: '#00ff88',
                        filter: 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.5))'
                      }}
                    >
                      {prediction.predicted_rsvps}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    Expected attendance based on ML model
                  </Typography>
                </Box>

                {/* Confidence */}
                <Box
                  sx={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
                      Confidence Level
                    </Typography>
                    <Chip 
                      label={prediction.confidence}
                      size="medium"
                      sx={{ 
                        background: `linear-gradient(135deg, ${getConfidenceColor(prediction.confidence)} 0%, ${getConfidenceColor(prediction.confidence)}cc 100%)`,
                        color: 'white',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        border: `2px solid ${getConfidenceColor(prediction.confidence)}`,
                        boxShadow: `0 0 20px ${getConfidenceColor(prediction.confidence)}40`
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', display: 'block' }}>
                    {prediction.confidence === 'High' && '🎯 Very likely to succeed'}
                    {prediction.confidence === 'Medium' && '📊 Good chance of success'}
                    {prediction.confidence === 'Low' && '⚠️ Could use improvement'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 4, bgcolor: 'rgba(255, 255, 255, 0.1)' }} />

                {/* Why this event */}
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 212, 170, 0.15) 100%)',
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(0, 255, 136, 0.3)'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#00ff88', 
                      fontWeight: 800, 
                      mb: 1.5, 
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: 1
                    }}
                  >
                    💡 Why This Event?
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.7 }}>
                    Based on timing, location popularity, club affiliation, and engagement factors, this event has the highest predicted success rate in the next 10 days.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Info Alert */}
        <Box
          sx={{
            mt: 5,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: 3,
            p: 3,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 2
          }}
        >
          <TrendingUpIcon sx={{ color: '#00ff88', fontSize: 28, mt: 0.5 }} />
          <Box>
            <Typography variant="body1" fontWeight="700" sx={{ color: 'white', mb: 1 }}>
              How it works
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.7 }}>
              Our ML model trains on 500+ historical BC events to identify patterns. It analyzes timing, location, club affiliation, emoji engagement, and capacity to predict which events will be most successful.
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* Full Screen Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            boxShadow: 'none'
          }
        }}
      >
        <IconButton
          onClick={() => setImageDialogOpen(false)}
          sx={{
            position: 'absolute',
            right: 20,
            top: 20,
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.2)',
            },
            zIndex: 2
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            minHeight: '90vh'
          }}
        >
          <img
            src={goatedEvent?.invitation_image}
            alt={goatedEvent?.function_name}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
}

export default GoatedPrediction;