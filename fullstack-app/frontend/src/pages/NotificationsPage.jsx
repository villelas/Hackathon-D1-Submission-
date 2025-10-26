import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Divider,
  Chip,
  Stack,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  TextField,
  CircularProgress,
  Badge,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import StarIcon from '@mui/icons-material/Star';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';

const API_URL = 'http://127.0.0.1:8000/api';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0); // 0 = All, 1 = Action Required
  
  // Rating dialog state
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/users/${user.user_id}/notifications`);
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setSnackbar({
        open: true,
        message: 'Failed to load notifications',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_URL}/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.notification_id === notificationId ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      
      setNotifications(notifications.filter(n => n.notification_id !== notificationId));
      
      setSnackbar({
        open: true,
        message: 'Notification deleted',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting notification:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete notification',
        severity: 'error'
      });
    }
  };

  const handleAcceptInvite = async (notification) => {
    try {
      // Mark notification as read
      await markAsRead(notification.notification_id);
      
      // RSVP to the event
      await axios.post(`${API_URL}/events/${notification.event_id}/rsvp`, {
        user_id: user.user_id,
        user_alias: user.ai_generated_alias || 'User'
      });
      
      setSnackbar({
        open: true,
        message: '✅ You\'re going! The organizer has been notified.',
        severity: 'success'
      });
      
      // Remove notification
      await deleteNotification(notification.notification_id);
      
    } catch (err) {
      console.error('Error accepting invite:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to RSVP',
        severity: 'error'
      });
    }
  };

  const handleDeclineInvite = async (notification) => {
    try {
      await deleteNotification(notification.notification_id);
      
      setSnackbar({
        open: true,
        message: 'Invite declined',
        severity: 'info'
      });
    } catch (err) {
      console.error('Error declining invite:', err);
    }
  };

  const handleRateClick = (notification) => {
    setSelectedEvent({
      event_id: notification.event_id,
      event_name: notification.event_name,
      notification_id: notification.notification_id
    });
    setRating(0);
    setRatingComment('');
    setRatingDialogOpen(true);
    markAsRead(notification.notification_id);
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setSnackbar({
        open: true,
        message: 'Please select a rating',
        severity: 'warning'
      });
      return;
    }

    setSubmittingRating(true);
    
    try {
      await axios.post(`${API_URL}/events/${selectedEvent.event_id}/rate`, {
        user_id: user.user_id,
        rating: rating,
        comment: ratingComment,
        attended: true
      });
      
      setSnackbar({
        open: true,
        message: '⭐ Thank you for rating the function!',
        severity: 'success'
      });
      
      // Delete the rating notification
      await deleteNotification(selectedEvent.notification_id);
      
      setRatingDialogOpen(false);
      
    } catch (err) {
      console.error('Error submitting rating:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.detail || 'Failed to submit rating',
        severity: 'error'
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'private_invite':
        return '🎉';
      case 'rsvp_received':
        return '✅';
      case 'rate_function':
        return '⭐';
      case 'function_cancelled':
        return '❌';
      default:
        return '📬';
    }
  };

  const getTimeAgo = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const filteredNotifications = tabValue === 0 
    ? notifications 
    : notifications.filter(n => n.action_required);

  const unreadCount = notifications.filter(n => !n.read).length;
  const actionRequiredCount = notifications.filter(n => n.action_required && !n.read).length;

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
            Notifications
          </Typography>
          <Badge badgeContent={unreadCount} sx={{ '& .MuiBadge-badge': { bgcolor: '#00ff88', color: 'black' } }}>
            <NotificationsIcon sx={{ color: '#00ff88' }} />
          </Badge>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
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
            Your Notifications 📬
          </Typography>
          {unreadCount > 0 && (
            <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* Tabs */}
        <Card
          elevation={0}
          sx={{
            mb: 3,
            bgcolor: 'rgba(20, 20, 20, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 3
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.6)',
                fontWeight: 'bold'
              },
              '& .Mui-selected': {
                color: '#00ff88 !important'
              },
              '& .MuiTabs-indicator': {
                bgcolor: '#00ff88'
              }
            }}
          >
            <Tab label={`All (${notifications.length})`} sx={{ flex: 1 }} />
            <Tab label={`Action Required (${actionRequiredCount})`} sx={{ flex: 1 }} />
          </Tabs>
        </Card>

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#00ff88' }} size={60} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          /* Empty State */
          <Card
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
            <NotificationsIcon sx={{ fontSize: 80, color: 'rgba(0, 255, 136, 0.3)', mb: 2 }} />
            <Typography variant="h5" sx={{ color: 'white', mb: 2, fontWeight: 'bold' }}>
              No Notifications
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              {tabValue === 0 ? 'You\'re all caught up!' : 'No actions required right now'}
            </Typography>
          </Card>
        ) : (
          /* Notifications List */
          <Stack spacing={2}>
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.notification_id}
                elevation={0}
                sx={{
                  bgcolor: notification.read ? 'rgba(20, 20, 20, 0.4)' : 'rgba(0, 255, 136, 0.05)',
                  backdropFilter: 'blur(20px)',
                  border: notification.read
                    ? '1px solid rgba(0, 255, 136, 0.1)'
                    : '1px solid rgba(0, 255, 136, 0.3)',
                  borderRadius: 3,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    {/* Icon */}
                    <Typography sx={{ fontSize: '2rem' }}>
                      {getNotificationIcon(notification.type)}
                    </Typography>

                    {/* Content */}
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#00ff88',
                          fontWeight: 'bold',
                          mb: 0.5
                        }}
                      >
                        {notification.title}
                      </Typography>

                      <Typography
                        variant="body1"
                        sx={{
                          color: 'white',
                          mb: 1
                        }}
                      >
                        {notification.message}
                      </Typography>

                      {/* Event Details */}
                      <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                        <Chip
                          icon={<EventIcon />}
                          label={notification.event_name}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(0, 255, 136, 0.1)',
                            color: '#00ff88',
                            border: '1px solid rgba(0, 255, 136, 0.3)'
                          }}
                        />
                        {notification.sender_name && (
                          <Chip
                            icon={<PersonIcon />}
                            label={notification.sender_name}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(0, 255, 136, 0.1)',
                              color: 'rgba(255, 255, 255, 0.8)',
                              border: '1px solid rgba(0, 255, 136, 0.3)'
                            }}
                          />
                        )}
                      </Stack>

                      {/* Time and Action Required Badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography
                          variant="caption"
                          sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                        >
                          {getTimeAgo(notification.created_at)}
                        </Typography>
                        {notification.action_required && !notification.read && (
                          <Chip
                            label="Action Required"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255, 152, 0, 0.2)',
                              color: '#ff9800',
                              border: '1px solid rgba(255, 152, 0, 0.5)',
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Delete Button */}
                    {!notification.action_required && (
                      <IconButton
                        size="small"
                        onClick={() => deleteNotification(notification.notification_id)}
                        sx={{
                          color: 'rgba(255, 255, 255, 0.3)',
                          '&:hover': {
                            color: '#ff4444'
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </CardContent>

                {/* Action Buttons */}
                {notification.action_required && !notification.read && (
                  <CardActions sx={{ p: 3, pt: 0, gap: 1 }}>
                    {notification.type === 'private_invite' && (
                      <>
                        <Button
                          variant="contained"
                          startIcon={<CheckCircleIcon />}
                          onClick={() => handleAcceptInvite(notification)}
                          sx={{
                            bgcolor: '#00ff88',
                            color: 'black',
                            fontWeight: 'bold',
                            flex: 1,
                            '&:hover': {
                              bgcolor: '#00dd77'
                            }
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<CancelIcon />}
                          onClick={() => handleDeclineInvite(notification)}
                          sx={{
                            borderColor: 'rgba(255, 68, 68, 0.5)',
                            color: '#ff4444',
                            flex: 1,
                            '&:hover': {
                              borderColor: '#ff4444',
                              bgcolor: 'rgba(255, 68, 68, 0.1)'
                            }
                          }}
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {notification.type === 'rate_function' && (
                      <Button
                        variant="contained"
                        startIcon={<StarIcon />}
                        fullWidth
                        onClick={() => handleRateClick(notification)}
                        sx={{
                          bgcolor: '#00ff88',
                          color: 'black',
                          fontWeight: 'bold',
                          '&:hover': {
                            bgcolor: '#00dd77'
                          }
                        }}
                      >
                        Rate Function
                      </Button>
                    )}
                  </CardActions>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      {/* Rating Dialog */}
      <Dialog
        open={ratingDialogOpen}
        onClose={() => !submittingRating && setRatingDialogOpen(false)}
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
          ⭐ Rate the Function
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedEvent && (
            <Box>
              <Typography variant="h6" sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
                How was {selectedEvent.event_name}?
              </Typography>

              {/* Star Rating */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Rating
                  value={rating}
                  onChange={(event, newValue) => setRating(newValue)}
                  size="large"
                  sx={{
                    fontSize: '3rem',
                    '& .MuiRating-iconFilled': {
                      color: '#00ff88'
                    },
                    '& .MuiRating-iconHover': {
                      color: '#00ff88'
                    }
                  }}
                />
              </Box>

              {rating > 0 && (
                <Typography
                  variant="h6"
                  sx={{
                    color: '#00ff88',
                    textAlign: 'center',
                    mb: 3
                  }}
                >
                  {rating === 1 && '😞 Not great'}
                  {rating === 2 && '😕 Could be better'}
                  {rating === 3 && '😊 Good'}
                  {rating === 4 && '😄 Great!'}
                  {rating === 5 && '🤩 Amazing!'}
                </Typography>
              )}

              {/* Comment (Optional) */}
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Add a comment (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(0, 255, 136, 0.3)'
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 255, 136, 0.5)'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00ff88'
                    }
                  }
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button
            onClick={() => setRatingDialogOpen(false)}
            disabled={submittingRating}
            sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitRating}
            disabled={submittingRating || rating === 0}
            sx={{
              bgcolor: '#00ff88',
              color: 'black',
              fontWeight: 'bold',
              '&:hover': {
                bgcolor: '#00dd77'
              }
            }}
          >
            {submittingRating ? 'Submitting...' : 'Submit Rating'}
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

export default NotificationsPage;