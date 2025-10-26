import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Divider,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PeopleIcon from '@mui/icons-material/People';
import WarningIcon from '@mui/icons-material/Warning';
import LinkIcon from '@mui/icons-material/Link';
import AddCircleIcon from '@mui/icons-material/AddCircle';

const API_URL = 'http://127.0.0.1:8000/api';

const MyFunctionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentFunctions, setCurrentFunctions] = useState([]);
  const [pastFunctions, setPastFunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0); // 0 = Current, 1 = Past
  
  // Share link dialog
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [shareLink, setShareLink] = useState('');
  
  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [functionToCancel, setFunctionToCancel] = useState(null);
  const [isSameDay, setIsSameDay] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchUserFunctions();
  }, []);

  const fetchUserFunctions = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First, check and move any of THIS user's past events to historical
      // More efficient than moving all events system-wide
      try {
        await axios.post(`${API_URL}/users/${user.user_id}/move-past-functions`);
        console.log('✅ Checked and moved user\'s past events to historical');
      } catch (err) {
        console.warn('⚠️ Could not move past events (non-critical):', err);
        // Don't fail the whole page if this fails
      }
      
      // Then fetch updated user functions
      const response = await axios.get(`${API_URL}/users/${user.user_id}/functions`);
      
      setCurrentFunctions(response.data.current_functions || []);
      setPastFunctions(response.data.past_functions || []);
      
    } catch (err) {
      console.error('Error fetching functions:', err);
      setError('Failed to load your functions');
    } finally {
      setLoading(false);
    }
  };

  const handleShareLinkClick = (func) => {
    setSelectedFunction(func);
    
    // Generate shareable link
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite/${func.event_id}`;
    setShareLink(link);
    
    setShareLinkOpen(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setSnackbar({
      open: true,
      message: 'Link copied to clipboard! 📋',
      severity: 'success'
    });
  };

  const handleCancelClick = (func) => {
    setFunctionToCancel(func);
    
    // Check if cancelling on the same day as the event
    const eventDate = new Date(func.date);
    const today = new Date();
    
    const isSameDayCheck = 
      eventDate.getFullYear() === today.getFullYear() &&
      eventDate.getMonth() === today.getMonth() &&
      eventDate.getDate() === today.getDate();
    
    setIsSameDay(isSameDayCheck);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    
    try {
      // Cancel the event
      await axios.delete(`${API_URL}/events/${functionToCancel.event_id}`, {
        data: {
          user_id: user.user_id,
          cancelled_same_day: isSameDay
        }
      });
      
      // Show success message
      if (isSameDay) {
        setSnackbar({
          open: true,
          message: '⚠️ Event cancelled. Your rating decreased by 2 points for same-day cancellation.',
          severity: 'warning'
        });
      } else {
        setSnackbar({
          open: true,
          message: '✅ Event cancelled successfully',
          severity: 'success'
        });
      }
      
      // Refresh functions list
      await fetchUserFunctions();
      
      setCancelDialogOpen(false);
      setFunctionToCancel(null);
      
    } catch (err) {
      console.error('Error cancelling event:', err);
      setSnackbar({
        open: true,
        message: 'Failed to cancel event. Please try again.',
        severity: 'error'
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getTimeUntilEvent = (dateString) => {
    try {
      const eventDate = new Date(dateString);
      const now = new Date();
      const diffMs = eventDate - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} away`;
      } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} away`;
      } else if (diffMs > 0) {
        return 'Starting soon!';
      } else {
        return 'Event passed';
      }
    } catch {
      return '';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: '#0a0a0a',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 255, 136, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 255, 136, 0.03) 0%, transparent 50%)'
    }}>
      {/* Top Bar */}
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <IconButton
            edge="start"
            sx={{ color: '#00ff88' }}
            onClick={() => navigate('/dashboard')}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'white', fontWeight: 'bold', ml: 2 }}>
            My Functions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleIcon />}
            onClick={() => navigate('/create-event')}
            sx={{
              bgcolor: '#00ff88',
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#00dd77',
              }
            }}
          >
            Create New
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography 
            variant="h3" 
            gutterBottom 
            sx={{ 
              fontWeight: 'bold',
              color: '#00ff88',
              textShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
            }}
          >
            Your Functions 🎉
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
            Share your invites and manage your events
          </Typography>
        </Box>

        {/* Tabs for Current/Past */}
        <Paper 
          elevation={0}
          sx={{ 
            mb: 3,
            bgcolor: 'rgba(20, 20, 20, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 3,
            overflow: 'hidden'
          }}
        >
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 'bold',
                fontSize: '1rem',
                py: 2,
              },
              '& .Mui-selected': {
                color: '#00ff88 !important',
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#00ff88',
                height: 3,
              }
            }}
          >
            <Tab 
              label={`Upcoming (${currentFunctions.length})`}
              sx={{ flex: 1 }}
            />
            <Tab 
              label={`Past (${pastFunctions.length})`}
              sx={{ flex: 1 }}
            />
          </Tabs>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#00ff88' }} size={60} />
          </Box>
        ) : (currentFunctions.length === 0 && pastFunctions.length === 0) ? (
          /* Empty State */
          <Paper 
            elevation={0}
            sx={{ 
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(20, 20, 20, 0.6)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: 3
            }}
          >
            <EventIcon sx={{ fontSize: 80, color: 'rgba(0, 255, 136, 0.3)', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
              No Functions Yet
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
              Create your first function to get started!
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddCircleIcon />}
              onClick={() => navigate('/create-event')}
              sx={{
                bgcolor: '#00ff88',
                color: 'black',
                fontWeight: 'bold',
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#00dd77',
                }
              }}
            >
              Create Function
            </Button>
          </Paper>
        ) : (
          /* Functions Grid */
          <Grid container spacing={3}>
            {(tabValue === 0 ? currentFunctions : pastFunctions).map((func, index) => (
              <Grid item xs={12} md={6} key={func.event_id || index}>
                <Card 
                  sx={{ 
                    bgcolor: 'rgba(20, 20, 20, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    borderRadius: 3,
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 32px rgba(0, 255, 136, 0.2)'
                    }
                  }}
                >
                  {/* Invite Image */}
                  {func.invitation_image && (
                    <CardMedia
                      component="img"
                      image={func.invitation_image}
                      alt={func.function_name}
                      sx={{ 
                        height: 350,
                        objectFit: 'cover',
                        bgcolor: 'black'
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ p: 3 }}>
                    {/* Function Name */}
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#00ff88',
                        fontWeight: 'bold',
                        mb: 2
                      }}
                    >
                      {func.function_name}
                    </Typography>

                    {/* Vibe Emojis */}
                    {func.emoji_vibe && func.emoji_vibe.length > 0 && (
                      <Box sx={{ mb: 2 }}>
                        {func.emoji_vibe.map((emoji, i) => (
                          <Chip
                            key={i}
                            label={emoji}
                            sx={{
                              fontSize: '1.2rem',
                              bgcolor: 'rgba(0, 255, 136, 0.1)',
                              border: '1px solid rgba(0, 255, 136, 0.3)',
                              mr: 1
                            }}
                          />
                        ))}
                      </Box>
                    )}

                    <Divider sx={{ borderColor: 'rgba(0, 255, 136, 0.2)', my: 2 }} />

                    {/* Event Details */}
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon sx={{ color: '#00ff88', fontSize: 20 }} />
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {formatDate(func.date)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ color: '#00ff88', fontSize: 20 }} />
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          Location TBD
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon sx={{ color: '#00ff88', fontSize: 20 }} />
                        <Typography sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {tabValue === 0 
                            ? `${func.number_of_invites || 0} invites sent`
                            : `${func.final_attendee_count || 0} attendees`
                          }
                        </Typography>
                      </Box>

                      {/* Time Until Event or Completed Status */}
                      {tabValue === 0 ? (
                        <Chip
                          label={getTimeUntilEvent(func.date)}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 255, 136, 0.2)',
                            color: '#00ff88',
                            fontWeight: 'bold',
                            alignSelf: 'flex-start'
                          }}
                        />
                      ) : (
                        <Chip
                          label="Completed ✓"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(136, 136, 136, 0.2)',
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 'bold',
                            alignSelf: 'flex-start'
                          }}
                        />
                      )}

                      {/* Status */}
                      <Chip
                        label={func.public_or_private === 'public' ? 'Public' : 'Private'}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: 'rgba(0, 255, 136, 0.3)',
                          color: 'rgba(255, 255, 255, 0.7)',
                          alignSelf: 'flex-start'
                        }}
                      />
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ p: 3, pt: 0, gap: 1 }}>
                    {tabValue === 0 ? (
                      /* Current Events - Show Share and Cancel */
                      <>
                        {/* Share Link Button */}
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<LinkIcon />}
                          onClick={() => handleShareLinkClick(func)}
                          sx={{
                            bgcolor: '#00ff88',
                            color: 'black',
                            fontWeight: 'bold',
                            '&:hover': {
                              bgcolor: '#00dd77',
                            }
                          }}
                        >
                          Share Link
                        </Button>

                        {/* Cancel Button */}
                        <Tooltip 
                          title={
                            new Date(func.date).toDateString() === new Date().toDateString()
                              ? "⚠️ Cancelling today will reduce your rating by 2 points!"
                              : "Cancel this function"
                          }
                          arrow
                        >
                          <Button
                            variant="outlined"
                            onClick={() => handleCancelClick(func)}
                            sx={{
                              borderColor: 'rgba(255, 68, 68, 0.5)',
                              color: '#ff4444',
                              '&:hover': {
                                borderColor: '#ff4444',
                                bgcolor: 'rgba(255, 68, 68, 0.1)',
                              }
                            }}
                          >
                            <DeleteIcon />
                          </Button>
                        </Tooltip>
                      </>
                    ) : (
                      /* Past Events - Show Share Only */
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<ShareIcon />}
                        onClick={() => handleShareLinkClick(func)}
                        sx={{
                          bgcolor: 'rgba(0, 255, 136, 0.5)',
                          color: 'white',
                          fontWeight: 'bold',
                          '&:hover': {
                            bgcolor: 'rgba(0, 255, 136, 0.7)',
                          }
                        }}
                      >
                        View Memory
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Share Link Dialog */}
      <Dialog 
        open={shareLinkOpen} 
        onClose={() => setShareLinkOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ color: '#00ff88', fontWeight: 'bold', borderBottom: '1px solid rgba(0, 255, 136, 0.2)' }}>
          Share Invite Link 🔗
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedFunction && (
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                {selectedFunction.function_name}
              </Typography>
              
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 3 }}>
                Share this link with your friends to invite them to your function!
              </Typography>

              {/* Shareable Link */}
              <Paper
                sx={{
                  p: 2,
                  bgcolor: 'rgba(0, 255, 136, 0.05)',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                  borderRadius: 2,
                  mb: 2
                }}
              >
                <Typography 
                  sx={{ 
                    color: '#00ff88',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }}
                >
                  {shareLink}
                </Typography>
              </Paper>

              <Button
                variant="contained"
                fullWidth
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
                sx={{
                  bgcolor: '#00ff88',
                  color: 'black',
                  fontWeight: 'bold',
                  py: 1.5,
                  '&:hover': {
                    bgcolor: '#00dd77',
                  }
                }}
              >
                Copy Link
              </Button>

              <Divider sx={{ borderColor: 'rgba(0, 255, 136, 0.2)', my: 3 }} />

              {/* Share Instructions */}
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 2 }}>
                💡 <strong>How to share:</strong>
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', pl: 3 }}>
                  • Copy the link and send via text/DM
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', pl: 3 }}>
                  • Post on your Instagram story
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', pl: 3 }}>
                  • Share in group chats
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', pl: 3 }}>
                  • Add to your bio or link tree
                </Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setShareLinkOpen(false)}
            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => !cancelling && setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          color: '#ff4444', 
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255, 68, 68, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <WarningIcon />
          Cancel Function?
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {functionToCancel && (
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                {functionToCancel.function_name}
              </Typography>

              {isSameDay ? (
                <Alert 
                  severity="warning" 
                  sx={{ 
                    mb: 2,
                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid rgba(255, 152, 0, 0.3)',
                    '& .MuiAlert-icon': {
                      color: '#ff9800'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ⚠️ Same-Day Cancellation Penalty
                  </Typography>
                  <Typography variant="body2">
                    Cancelling on the day of your function will <strong>decrease your rating by 2 points</strong>.
                  </Typography>
                </Alert>
              ) : (
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 2,
                    bgcolor: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    '& .MuiAlert-icon': {
                      color: '#00ff88'
                    }
                  }}
                >
                  <Typography variant="body2">
                    This function will be removed from the events collection and your current functions.
                  </Typography>
                </Alert>
              )}

              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                Are you sure you want to cancel this function? This action cannot be undone.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
          <Button 
            onClick={() => setCancelDialogOpen(false)}
            disabled={cancelling}
            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Keep Function
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmCancel}
            disabled={cancelling}
            sx={{
              bgcolor: '#ff4444',
              color: 'white',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#dd3333',
              }
            }}
          >
            {cancelling ? 'Cancelling...' : isSameDay ? 'Cancel Anyway (-2 Rating)' : 'Cancel Function'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity={snackbar.severity} 
          sx={{ 
            bgcolor: snackbar.severity === 'success' ? 'rgba(0, 255, 136, 0.9)' : undefined,
            color: snackbar.severity === 'success' ? 'black' : undefined
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyFunctionsPage;