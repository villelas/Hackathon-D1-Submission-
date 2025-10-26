import React, { useState, useEffect } from 'react';
import { 
  AppBar,
  Box, 
  Toolbar,
  Typography, 
  Button,
  Container,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Modal,
  Backdrop,
  Fade,
  LinearProgress,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MapIcon from '@mui/icons-material/Map';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';

const API_URL = 'http://127.0.0.1:8000/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [userRsvps, setUserRsvps] = useState(new Set()); // Track which events user has RSVP'd to

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all events
      const response = await axios.get(`${API_URL}/events`);
      const allEvents = response.data;
      
      // Filter to only show upcoming events (within next 10 days)
      const now = new Date();
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
      
      const upcomingEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= tenDaysFromNow;
      });
      
      // Sort by date (earliest first)
      upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Track which events the current user has RSVP'd to
      const rsvpSet = new Set();
      upcomingEvents.forEach(event => {
        const attendees = event.attendees || [];
        const hasRsvpd = attendees.some(a => a.user_id === user?.user_id);
        if (hasRsvpd) {
          rsvpSet.add(event.event_id);
        }
      });
      setUserRsvps(rsvpSet);
      
      // For each event, fetch organizer details to get their rating
      const eventsWithOrganizerData = await Promise.all(
        upcomingEvents.map(async (event) => {
          try {
            // Fetch organizer user data
            const userResponse = await axios.get(`${API_URL}/users/${event.organizer_user_id}`);
            const organizerData = userResponse.data;
            
            return {
              id: event.event_id,
              title: event.function_name,
              location: event.location,
              date: event.date,
              vibe: event.emoji_vibe || [],
              attendees: event.rsvp_count || 0,
              maxCapacity: event.max_capacity || 50,
              organizer: event.organizer_alias,
              organizerUserId: event.organizer_user_id,
              organizerRating: organizerData.personal_rating || 5,
              organizerHostCount: organizerData.current_functions?.length || 0,
              organizerVibeDescription: organizerData.bio || "No description available",
              description: event.description,
              publicOrPrivate: event.public_or_private,
              clubAffiliated: event.club_affiliated,
              clubName: event.club_name,
              invitationImage: event.invitation_image
            };
          } catch (err) {
            console.error(`Error fetching organizer data for event ${event.event_id}:`, err);
            // Return event with default organizer data if fetch fails
            return {
              id: event.event_id,
              title: event.function_name,
              location: event.location,
              date: event.date,
              vibe: event.emoji_vibe || [],
              attendees: event.rsvp_count || 0,
              maxCapacity: event.max_capacity || 50,
              organizer: event.organizer_alias,
              organizerUserId: event.organizer_user_id,
              organizerRating: 5,
              organizerHostCount: 0,
              organizerVibeDescription: "No description available",
              description: event.description,
              publicOrPrivate: event.public_or_private,
              clubAffiliated: event.club_affiliated,
              clubName: event.club_name,
              invitationImage: event.invitation_image
            };
          }
        })
      );
      
      setEvents(eventsWithOrganizerData);
      
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEvent(null);
  };

  const handleRSVP = async (eventId) => {
    if (!user) {
      setError('You must be logged in to RSVP');
      return;
    }

    try {
      setRsvpLoading(true);
      setError('');

      // Check if user has already RSVP'd
      if (userRsvps.has(eventId)) {
        // Cancel RSVP
        await axios.delete(`${API_URL}/events/${eventId}/rsvp/${user.user_id}`);
        
        // Update local state
        setUserRsvps(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });

        // Update event attendee count
        setEvents(prevEvents => 
          prevEvents.map(e => 
            e.id === eventId 
              ? { ...e, attendees: Math.max(0, e.attendees - 1) }
              : e
          )
        );

        // Update selected event if modal is open
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(prev => ({
            ...prev,
            attendees: Math.max(0, prev.attendees - 1)
          }));
        }

      } else {
        // Create RSVP
        const response = await axios.post(`${API_URL}/events/${eventId}/rsvp`, {
          user_id: user.user_id,
          user_alias: user.ai_generated_alias
        });

        // Update local state
        setUserRsvps(prev => new Set(prev).add(eventId));

        // Update event attendee count
        setEvents(prevEvents => 
          prevEvents.map(e => 
            e.id === eventId 
              ? { ...e, attendees: response.data.attendee_count }
              : e
          )
        );

        // Update selected event if modal is open
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(prev => ({
            ...prev,
            attendees: response.data.attendee_count
          }));
        }
      }

    } catch (err) {
      console.error('Error with RSVP:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to RSVP. Please try again.');
      }
    } finally {
      setRsvpLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return '#4caf50'; // Green
    if (rating >= 4) return '#ff9800'; // Yellow/Orange
    return '#f44336'; // Red
  };

  const getRatingCaption = (rating, organizer) => {
    if (rating >= 8) return `${organizer} hosts 🔥 functions`;
    if (rating >= 4) return `${organizer} hosts mid functions`;
    return `Do you think ${organizer} will pull through this time? 🤔`;
  };

  const getRatingEmoji = (rating) => {
    if (rating >= 8) return '🔥';
    if (rating >= 4) return '😐';
    return '💀';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    }
  };

  const getCapacityColor = (attendees, max) => {
    const percentage = (attendees / max) * 100;
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Navigation Bar */}
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4, fontWeight: 'bold' }}>
            BCPlugHub
          </Typography>
          
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              startIcon={<AddCircleIcon />}
              onClick={() => navigate('/create-event')}
            >
              Create Function
            </Button>
             <Button 
              color="inherit" 
              startIcon={<StarIcon />}
              onClick={() => navigate('/myfunctions')}
            >
              My Functions
            </Button>
            <Button 
              color="inherit" 
              startIcon={<TrendingUpIcon />}
              onClick={() => navigate('/predicted')}
            >
              Goated Predicted
            </Button>
            <Button 
              color="inherit" 
              startIcon={<MapIcon />}
              onClick={() => navigate('/map')}
            >
              BC Map
            </Button>
          </Box>

          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleProfileMenuOpen}
          >
            <AccountCircleIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { navigate('/notifications'); handleMenuClose(); }}>
              Notifications
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
            What's Tuff 🔥
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Events happening in the next 10 days
          </Typography>
        </Box>

        {/* User Alias Card */}
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                {user?.name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {user?.ai_generated_alias || 'Loading...'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {user?.name}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Events Grid */}
            <Grid container spacing={3}>
              {events.map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <Card sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6,
                      transition: 'all 0.3s'
                    }
                  }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                        {event.title}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationOnIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {event.location}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <CalendarTodayIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(event.date)}
                        </Typography>
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                          Vibe:
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {event.vibe.map((emoji, index) => (
                            <Chip 
                              key={index}
                              label={emoji} 
                              size="small"
                              sx={{ fontSize: '1.2rem' }}
                            />
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" color="action" />
                        <Chip 
                          label={`${event.attendees}/${event.maxCapacity}`}
                          size="small"
                          color={getCapacityColor(event.attendees, event.maxCapacity)}
                        />
                      </Box>

                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        Organized by {event.organizer}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ flexDirection: 'column', gap: 1, p: 2, pt: 0 }}>
                      <Button 
                        size="small" 
                        variant={userRsvps.has(event.id) ? 'contained' : 'outlined'}
                        color={userRsvps.has(event.id) ? 'success' : 'primary'}
                        fullWidth
                        onClick={() => handleRSVP(event.id)}
                        disabled={rsvpLoading || (event.attendees >= event.maxCapacity && !userRsvps.has(event.id)) || event.organizerUserId === user?.user_id}
                        startIcon={userRsvps.has(event.id) ? <span>✓</span> : null}
                      >
                        {event.organizerUserId === user?.user_id 
                          ? 'Your Event' 
                          : userRsvps.has(event.id) 
                            ? 'RSVP\'d' 
                            : event.attendees >= event.maxCapacity 
                              ? 'Full' 
                              : 'RSVP'}
                      </Button>
                      <Button 
                        size="small" 
                        variant="text" 
                        fullWidth
                        onClick={() => handleEventClick(event)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {events.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No upcoming events
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Be the first to create one!
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddCircleIcon />}
                  onClick={() => navigate('/create-event')}
                >
                  Create Function
                </Button>
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Event Details Modal */}
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        closeAfterTransition
        slots={{ backdrop: Backdrop }}
        slotProps={{
          backdrop: {
            timeout: 500,
            sx: { 
              backdropFilter: 'blur(10px)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)'
            }
          },
        }}
      >
        <Fade in={modalOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 500 },
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            p: 4,
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {selectedEvent && (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                    Host Details
                  </Typography>
                  <IconButton onClick={handleCloseModal} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>

                {/* Organizer Info */}
                <Box sx={{ 
                  textAlign: 'center', 
                  mb: 3,
                  p: 3,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: '1px solid',
                  borderColor: 'rgba(102, 126, 234, 0.2)'
                }}>
                  <Avatar sx={{ 
                    width: 80, 
                    height: 80, 
                    margin: '0 auto 16px',
                    bgcolor: getRatingColor(selectedEvent.organizerRating),
                    fontSize: '2rem'
                  }}>
                    {getRatingEmoji(selectedEvent.organizerRating)}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {selectedEvent.organizer}
                  </Typography>
                  <Chip 
                    label={`${selectedEvent.organizerHostCount} functions hosted`}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Rating Section */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Function Rating
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <StarIcon sx={{ color: getRatingColor(selectedEvent.organizerRating) }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: getRatingColor(selectedEvent.organizerRating) }}>
                        {selectedEvent.organizerRating.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / 10
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress 
                    variant="determinate" 
                    value={(selectedEvent.organizerRating / 10) * 100}
                    sx={{ 
                      height: 12, 
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getRatingColor(selectedEvent.organizerRating),
                        borderRadius: 2
                      }
                    }}
                  />

                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mt: 2, 
                      fontWeight: 500,
                      color: getRatingColor(selectedEvent.organizerRating),
                      textAlign: 'center',
                      p: 2,
                      borderRadius: 1,
                      bgcolor: `${getRatingColor(selectedEvent.organizerRating)}15`
                    }}
                  >
                    {getRatingCaption(selectedEvent.organizerRating, selectedEvent.organizer)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                {/* Event Description */}
                {selectedEvent.description && (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Event Description
                      </Typography>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid',
                        borderColor: 'rgba(0, 0, 0, 0.08)'
                      }}>
                        <Typography variant="body2">
                          {selectedEvent.description}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                  </>
                )}

                {/* Typical Vibe Description */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Typical Vibe
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                    border: '1px solid',
                    borderColor: 'rgba(0, 0, 0, 0.08)'
                  }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {selectedEvent.organizerVibeDescription}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                      {selectedEvent.vibe.map((emoji, index) => (
                        <Chip 
                          key={index}
                          label={emoji} 
                          size="small"
                          sx={{ fontSize: '1.2rem' }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    onClick={handleCloseModal}
                  >
                    Close
                  </Button>
                  <Button 
                    variant={userRsvps.has(selectedEvent.id) ? 'outlined' : 'contained'}
                    color={userRsvps.has(selectedEvent.id) ? 'error' : 'primary'}
                    fullWidth
                    onClick={() => handleRSVP(selectedEvent.id)}
                    disabled={rsvpLoading || (selectedEvent.attendees >= selectedEvent.maxCapacity && !userRsvps.has(selectedEvent.id)) || selectedEvent.organizerUserId === user?.user_id}
                  >
                    {selectedEvent.organizerUserId === user?.user_id 
                      ? 'Your Event' 
                      : userRsvps.has(selectedEvent.id) 
                        ? 'Cancel RSVP' 
                        : selectedEvent.attendees >= selectedEvent.maxCapacity 
                          ? 'Event Full' 
                          : 'RSVP to Function'}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
};

export default Dashboard;