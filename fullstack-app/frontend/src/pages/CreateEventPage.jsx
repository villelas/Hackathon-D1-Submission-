import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  AppBar,
  Toolbar,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardMedia,
  Fade,
  Zoom,
  CircularProgress,
  Stack,
  Autocomplete,
  Avatar,
  Divider
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';

const API_URL = 'http://127.0.0.1:8000/api';

// BC Campus Locations
const BC_LOCATIONS = [
  'Claver Hall',
  'Xavier Hall',
  'Loyola Hall',
  'Fenwick Hall',
  'Cheverus Hall',
  'Kostka Hall',
  'Welch Hall',
  'Roncalli Hall',
  'Gabelli Hall',
  'Stayer Hall',
  '90 St. Thomas More',
  'Ignacio Hall',
  'Rubenstein Hall',
  'Voute Hall',
  'The Mods',
  'Thomas More Apartments'
];

// Vibe Emoji Options
const VIBE_EMOJIS = [
  '🔥', '💃', '🎵', '🍻', '🌙', '✨', 
  '📚', '☕', '🎧', '🎮', '⚽', '🎬',
  '🍕', '🎉', '💪', '🏀', '🎤', '🎨'
];

const CreateEventPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    function_name: '',
    location: '',
    custom_location: '',
    date: new Date(),
    vibe_emojis: [],
    max_capacity: '',
    public_or_private: 'public',
    club_affiliated: false,
    club_name: ''
  });
  
  // Private event invite state
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [personalMessage, setPersonalMessage] = useState('');
  
  // Image generation state
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [imageConfirmed, setImageConfirmed] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all users when component mounts (for private event invites)
  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log('🔍 Fetching all users from API...');
      
      const response = await axios.get(`${API_URL}/users`);
      
      console.log('✅ Users fetched:', response.data);
      
      // Handle different response formats
      const usersData = response.data?.users || response.data || [];
      const totalCount = response.data?.count || usersData.length;
      
      console.log('📊 Total users:', totalCount);
      
      // Filter out current user from the list
      const otherUsers = usersData.filter(u => u.user_id !== user.user_id);
      
      console.log('👥 Users after filtering current user:', otherUsers.length);
      console.log('📋 User list:', otherUsers);
      
      setAllUsers(otherUsers);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to load users. Please refresh the page.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    // Reset image confirmation if key details change
    if (['function_name', 'location', 'custom_location', 'vibe_emojis'].includes(field)) {
      setImageConfirmed(false);
    }
  };

  const handleEmojiToggle = (emoji) => {
    if (formData.vibe_emojis.includes(emoji)) {
      handleChange('vibe_emojis', formData.vibe_emojis.filter(e => e !== emoji));
    } else if (formData.vibe_emojis.length < 3) {
      handleChange('vibe_emojis', [...formData.vibe_emojis, emoji]);
    }
  };

  const handleGenerateImage = async () => {
    // Validation
    if (!formData.function_name.trim()) {
      setError('Please enter a function name first');
      return;
    }
    if (!formData.location) {
      setError('Please select a location first');
      return;
    }
    if (formData.location === 'Other' && !formData.custom_location.trim()) {
      setError('Please specify the location');
      return;
    }
    if (formData.vibe_emojis.length === 0) {
      setError('Please select at least one vibe emoji');
      return;
    }

    setGeneratingImage(true);
    setError('');

    try {
      const finalLocation = formData.location === 'Other' 
        ? formData.custom_location 
        : formData.location;

      const response = await axios.post(`${API_URL}/generate-invite-preview`, {
        function_name: formData.function_name,
        location: finalLocation,
        date: formData.date.toISOString(),
        emoji_vibe: formData.vibe_emojis,
        organizer_alias: user.ai_generated_alias,
        description: ''
      });

      setGeneratedImage(response.data.invitation_image);
      setImageConfirmed(false);
      
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleConfirmImage = () => {
    setImageConfirmed(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Final validation
    if (!formData.function_name.trim()) {
      setError('Please enter a function name');
      return;
    }
    if (!formData.location) {
      setError('Please select a location');
      return;
    }
    if (formData.vibe_emojis.length === 0) {
      setError('Please select at least one vibe emoji');
      return;
    }
    if (!imageConfirmed) {
      setError('Please generate and confirm your invitation image');
      return;
    }
    
    // Validate private event invites
    if (formData.public_or_private === 'private' && selectedUsers.length === 0) {
      setError('Please invite at least one person to your private event');
      return;
    }
    
    setLoading(true);
    
    try {
      const finalLocation = formData.location === 'Other' 
        ? formData.custom_location 
        : formData.location;
      
      const payload = {
        function_name: formData.function_name,
        location: finalLocation,
        date: formData.date.toISOString(),
        description: '',
        emoji_vibe: formData.vibe_emojis,
        max_capacity: parseInt(formData.max_capacity) || 50,
        public_or_private: formData.public_or_private,
        club_affiliated: formData.club_affiliated,
        club_name: formData.club_affiliated ? formData.club_name : null,
        organizer_user_id: user.user_id,
        organizer_alias: user.ai_generated_alias,
        invitation_image: generatedImage
      };
      
      console.log('Sending payload:', payload);
      
      // Create event in backend
      const response = await axios.post(`${API_URL}/events`, payload);
      const eventId = response.data.event_id;
      
      // If private event, send invitations
      if (formData.public_or_private === 'private' && selectedUsers.length > 0) {
        const invitePayload = {
          invited_user_ids: selectedUsers.map(u => u.user_id),
          personal_message: personalMessage || null
        };
        
        console.log('Sending invitations:', invitePayload);
        
        await axios.post(`${API_URL}/events/${eventId}/invite-users`, invitePayload);
        
        setSuccess(`Function created and ${selectedUsers.length} invitations sent! 🎉`);
      } else {
        setSuccess('Function created successfully! 🎉');
      }
      
      // Redirect to dashboard after 1.5 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (err) {
      console.error('Error creating event:', err);
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        if (Array.isArray(detail)) {
          const errorMessages = detail.map(e => {
            if (typeof e === 'object') {
              return `${e.loc?.join(' -> ') || 'Field'}: ${e.msg}`;
            }
            return e;
          });
          setError(errorMessages.join(', '));
        } else {
          setError(detail);
        }
      } else {
        setError('Failed to create function. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate random color for avatar based on alias
  const getAvatarColor = (alias) => {
    const colors = [
      '#00ff88', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8dadc',
      '#ff7eb3', '#8bf0ba', '#ffd93d', '#6bcf7f', '#df99f0'
    ];
    const hash = alias.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
            Create Function
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box>
          <Paper 
            elevation={3}
            sx={{ 
              p: 4,
              bgcolor: 'rgba(20, 20, 20, 0.8)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: 3
            }}
          >
            {/* Title */}
            <Typography 
              variant="h4" 
              gutterBottom 
              sx={{ 
                color: '#00ff88',
                fontWeight: 'bold',
                textAlign: 'center',
                mb: 3,
                textShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
              }}
            >
              Create Your Function ✨
            </Typography>

            {/* Error/Success Messages */}
            {error && (
              <Fade in={true}>
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              </Fade>
            )}
            
            {success && (
              <Fade in={true}>
                <Alert severity="success" sx={{ mb: 3 }}>
                  {success}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {/* Function Name */}
                <TextField
                  fullWidth
                  required
                  label="Function Name"
                  placeholder="e.g., Late Night @ Gabelli"
                  value={formData.function_name}
                  onChange={(e) => handleChange('function_name', e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                  }}
                />

                {/* Location */}
                <FormControl fullWidth required>
                  <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)', '&.Mui-focused': { color: '#00ff88' } }}>
                    Location
                  </InputLabel>
                  <Select
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    label="Location"
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00ff88' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#1a1a1a',
                          '& .MuiMenuItem-root': {
                            color: 'white',
                            '&:hover': { bgcolor: 'rgba(0, 255, 136, 0.1)' },
                            '&.Mui-selected': { bgcolor: 'rgba(0, 255, 136, 0.2)' },
                          }
                        }
                      }
                    }}
                  >
                    {BC_LOCATIONS.map((location) => (
                      <MenuItem key={location} value={location}>{location}</MenuItem>
                    ))}
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>

                {/* Custom Location */}
                {formData.location === 'Other' && (
                  <Zoom in={true}>
                    <TextField
                      fullWidth
                      required
                      label="Specify Location"
                      placeholder="Enter the location"
                      value={formData.custom_location}
                      onChange={(e) => handleChange('custom_location', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                          '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                          '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                      }}
                    />
                  </Zoom>
                )}

                {/* Date & Time */}
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Date & Time"
                    value={formData.date}
                    onChange={(newValue) => handleChange('date', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: {
                          '& .MuiOutlinedInput-root': {
                            color: 'white',
                            '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                            '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                            '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                          },
                          '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                          '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                          '& .MuiSvgIcon-root': { color: '#00ff88' },
                        }
                      }
                    }}
                  />
                </LocalizationProvider>

                {/* Vibe Emojis */}
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Vibe (Select up to 3) *
                  </Typography>
                  <Grid container spacing={1}>
                    {VIBE_EMOJIS.map((emoji) => (
                      <Grid item key={emoji}>
                        <Chip
                          label={emoji}
                          onClick={() => handleEmojiToggle(emoji)}
                          sx={{
                            fontSize: '1.5rem',
                            padding: '10px',
                            cursor: 'pointer',
                            bgcolor: formData.vibe_emojis.includes(emoji) 
                              ? 'rgba(0, 255, 136, 0.3)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            border: formData.vibe_emojis.includes(emoji)
                              ? '2px solid #00ff88'
                              : '2px solid transparent',
                            '&:hover': {
                              bgcolor: 'rgba(0, 255, 136, 0.2)',
                            }
                          }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                  {formData.vibe_emojis.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Selected: {formData.vibe_emojis.join(' ')} ({formData.vibe_emojis.length}/3)
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Max Capacity */}
                <TextField
                  fullWidth
                  type="number"
                  label="Max Capacity (Optional)"
                  placeholder="Default: 50"
                  value={formData.max_capacity}
                  onChange={(e) => handleChange('max_capacity', e.target.value)}
                  inputProps={{ min: 1, max: 1000 }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                  }}
                />

                {/* Public or Private */}
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Event Type *
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.public_or_private}
                    exclusive
                    onChange={(e, newValue) => {
                      if (newValue !== null) {
                        handleChange('public_or_private', newValue);
                        // Reset selected users when switching
                        if (newValue === 'public') {
                          setSelectedUsers([]);
                          setPersonalMessage('');
                        }
                      }
                    }}
                    fullWidth
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        borderColor: 'rgba(0, 255, 136, 0.3)',
                        '&:hover': {
                          bgcolor: 'rgba(0, 255, 136, 0.1)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(0, 255, 136, 0.2)',
                          color: '#00ff88',
                          borderColor: '#00ff88',
                          '&:hover': {
                            bgcolor: 'rgba(0, 255, 136, 0.3)',
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="public">Public 🌍</ToggleButton>
                    <ToggleButton value="private">Private 🔒</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Private Event - Invite Users */}
                {formData.public_or_private === 'private' && (
                  <Zoom in={true}>
                    <Box 
                      sx={{ 
                        p: 3, 
                        bgcolor: 'rgba(0, 255, 136, 0.05)',
                        borderRadius: 2,
                        border: '1px solid rgba(0, 255, 136, 0.3)'
                      }}
                    >
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PersonAddIcon sx={{ color: '#00ff88' }} />
                          <Typography variant="h6" sx={{ color: '#00ff88', fontWeight: 'bold' }}>
                            Invite Friends
                          </Typography>
                          {loadingUsers && (
                            <CircularProgress size={20} sx={{ color: '#00ff88', ml: 1 }} />
                          )}
                          {!loadingUsers && allUsers.length > 0 && (
                            <Chip 
                              label={`${allUsers.length} users`} 
                              size="small"
                              sx={{ 
                                bgcolor: 'rgba(0, 255, 136, 0.2)',
                                color: '#00ff88',
                                fontWeight: 'bold'
                              }}
                            />
                          )}
                        </Box>

                        <Autocomplete
                          multiple
                          options={allUsers}
                          value={selectedUsers}
                          onChange={(event, newValue) => {
                            // Check capacity
                            if (newValue.length > (parseInt(formData.max_capacity) || 50)) {
                              setError(`Cannot invite more than ${parseInt(formData.max_capacity) || 50} people (max capacity)`);
                              return;
                            }
                            setSelectedUsers(newValue);
                            setError('');
                          }}
                          getOptionLabel={(option) => option.ai_generated_alias || option.bc_email}
                          loading={loadingUsers}
                          openOnFocus={true}
                          disableCloseOnSelect={true}
                          filterOptions={(options, state) => {
                            // If no input, show all users
                            if (!state.inputValue) {
                              return options;
                            }
                            // Otherwise filter by alias or email
                            const searchTerm = state.inputValue.toLowerCase();
                            return options.filter(option => 
                              (option.ai_generated_alias?.toLowerCase().includes(searchTerm)) ||
                              (option.bc_email?.toLowerCase().includes(searchTerm))
                            );
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Search and select friends"
                              placeholder="Click to see all users or type to search..."
                              helperText={`${allUsers.length} users available`}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  color: 'white',
                                  '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                                  '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                                  '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                                },
                                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                                '& .MuiFormHelperText-root': { color: 'rgba(255, 255, 255, 0.5)' },
                              }}
                            />
                          )}
                          renderOption={(props, option) => (
                            <Box
                              component="li"
                              {...props}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                p: 1.5,
                                '&:hover': {
                                  bgcolor: 'rgba(0, 255, 136, 0.1)'
                                }
                              }}
                            >
                              <Avatar
                                sx={{
                                  bgcolor: getAvatarColor(option.ai_generated_alias),
                                  color: 'black',
                                  fontWeight: 'bold'
                                }}
                              >
                                {option.ai_generated_alias?.[0]?.toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                                  {option.ai_generated_alias}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                                  {option.bc_email}
                                </Typography>
                              </Box>
                            </Box>
                          )}
                          renderTags={(tagValue, getTagProps) =>
                            tagValue.map((option, index) => (
                              <Chip
                                {...getTagProps({ index })}
                                avatar={
                                  <Avatar
                                    sx={{
                                      bgcolor: getAvatarColor(option.ai_generated_alias),
                                      color: 'black',
                                      width: 24,
                                      height: 24,
                                      fontSize: '0.75rem'
                                    }}
                                  >
                                    {option.ai_generated_alias?.[0]?.toUpperCase()}
                                  </Avatar>
                                }
                                label={option.ai_generated_alias}
                                sx={{
                                  bgcolor: 'rgba(0, 255, 136, 0.2)',
                                  color: 'white',
                                  border: '1px solid rgba(0, 255, 136, 0.5)',
                                  '& .MuiChip-deleteIcon': {
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    '&:hover': {
                                      color: 'white'
                                    }
                                  }
                                }}
                              />
                            ))
                          }
                          PaperComponent={({ children }) => (
                            <Paper
                              sx={{
                                bgcolor: '#1a1a1a',
                                border: '1px solid rgba(0, 255, 136, 0.3)',
                                color: 'white'
                              }}
                            >
                              {children}
                            </Paper>
                          )}
                        />

                        {selectedUsers.length > 0 && (
                          <Alert 
                            severity="info" 
                            sx={{ 
                              bgcolor: 'rgba(0, 255, 136, 0.1)',
                              color: 'white',
                              border: '1px solid rgba(0, 255, 136, 0.3)'
                            }}
                          >
                            {selectedUsers.length} friend{selectedUsers.length !== 1 ? 's' : ''} selected
                          </Alert>
                        )}

                        <Divider sx={{ borderColor: 'rgba(0, 255, 136, 0.2)' }} />

                        {/* Personal Message */}
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Personal Message (Optional)"
                          placeholder="Add a personal invite message..."
                          value={personalMessage}
                          onChange={(e) => setPersonalMessage(e.target.value)}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              color: 'white',
                              '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                              '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                              '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                            },
                            '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                          }}
                        />
                      </Stack>
                    </Box>
                  </Zoom>
                )}

                {/* Club Affiliated */}
                <Box>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    Club Affiliated?
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.club_affiliated ? 'yes' : 'no'}
                    exclusive
                    onChange={(e, newValue) => {
                      if (newValue !== null) {
                        handleChange('club_affiliated', newValue === 'yes');
                      }
                    }}
                    fullWidth
                    sx={{
                      '& .MuiToggleButton-root': {
                        color: 'rgba(255, 255, 255, 0.7)',
                        borderColor: 'rgba(0, 255, 136, 0.3)',
                        '&:hover': {
                          bgcolor: 'rgba(0, 255, 136, 0.1)',
                        },
                        '&.Mui-selected': {
                          bgcolor: 'rgba(0, 255, 136, 0.2)',
                          color: '#00ff88',
                          borderColor: '#00ff88',
                          '&:hover': {
                            bgcolor: 'rgba(0, 255, 136, 0.3)',
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="no">No</ToggleButton>
                    <ToggleButton value="yes">Yes</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Club Name */}
                {formData.club_affiliated && (
                  <Zoom in={true}>
                    <TextField
                      fullWidth
                      required
                      label="Club Name"
                      placeholder="e.g., UGBC, Finance Club"
                      value={formData.club_name}
                      onChange={(e) => handleChange('club_name', e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'white',
                          '& fieldset': { borderColor: 'rgba(0, 255, 136, 0.3)' },
                          '&:hover fieldset': { borderColor: 'rgba(0, 255, 136, 0.5)' },
                          '&.Mui-focused fieldset': { borderColor: '#00ff88' },
                        },
                        '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#00ff88' },
                      }}
                    />
                  </Zoom>
                )}

                {/* AI Image Section */}
                <Box sx={{ 
                  mt: 2,
                  p: 3,
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: 2,
                  border: '1px solid rgba(0, 255, 136, 0.2)'
                }}>
                  <Typography variant="h6" sx={{ color: '#00ff88', mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
                    AI Generated Invite ✨
                  </Typography>

                  {/* Image Display */}
                  {!generatedImage && !generatingImage && (
                    <Box
                      sx={{
                        height: 300,
                        bgcolor: 'rgba(0, 255, 136, 0.05)',
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                        border: '2px dashed rgba(0, 255, 136, 0.3)'
                      }}
                    >
                      <AutoAwesomeIcon sx={{ fontSize: 60, color: '#00ff88', mb: 2, opacity: 0.5 }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        Fill in the details and generate
                      </Typography>
                    </Box>
                  )}

                  {generatingImage && (
                    <Box
                      sx={{
                        height: 300,
                        borderRadius: 2,
                        mb: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(0, 255, 136, 0.05)'
                      }}
                    >
                      <CircularProgress size={60} sx={{ mb: 2, color: '#00ff88' }} />
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        Generating your invite...
                      </Typography>
                      <Typography variant="caption" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.5)' }}>
                        This may take 10-20 seconds
                      </Typography>
                    </Box>
                  )}

                  {generatedImage && !generatingImage && (
                    <Fade in={true}>
                      <Box>
                        <Card sx={{ mb: 2, position: 'relative', bgcolor: 'black', borderRadius: 2 }}>
                          <CardMedia
                            component="img"
                            image={generatedImage}
                            alt="Generated Invite"
                            sx={{ 
                              maxHeight: 500,
                              objectFit: 'contain'
                            }}
                          />
                          {imageConfirmed && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                bgcolor: '#00ff88',
                                color: 'black',
                                borderRadius: 1,
                                px: 2,
                                py: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                fontWeight: 'bold'
                              }}
                            >
                              <CheckCircleIcon fontSize="small" />
                              <Typography variant="caption" fontWeight="bold">
                                Confirmed
                              </Typography>
                            </Box>
                          )}
                        </Card>
                      </Box>
                    </Fade>
                  )}

                  {/* Action Buttons */}
                  <Stack direction="row" spacing={2}>
                    {!imageConfirmed ? (
                      <>
                        <Button
                          variant={generatedImage ? 'outlined' : 'contained'}
                          fullWidth
                          onClick={handleGenerateImage}
                          disabled={generatingImage}
                          startIcon={generatedImage ? <RefreshIcon /> : <AutoAwesomeIcon />}
                          sx={{
                            py: 1.5,
                            color: generatedImage ? '#00ff88' : 'black',
                            bgcolor: generatedImage ? 'transparent' : '#00ff88',
                            borderColor: '#00ff88',
                            '&:hover': {
                              bgcolor: generatedImage ? 'rgba(0, 255, 136, 0.1)' : '#00dd77',
                              borderColor: '#00ff88',
                            }
                          }}
                        >
                          {generatedImage ? 'Regenerate' : 'Generate Image'}
                        </Button>
                        {generatedImage && (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={handleConfirmImage}
                            startIcon={<CheckCircleIcon />}
                            sx={{
                              py: 1.5,
                              bgcolor: '#00ff88',
                              color: 'black',
                              fontWeight: 'bold',
                              '&:hover': {
                                bgcolor: '#00dd77',
                              }
                            }}
                          >
                            Confirm
                          </Button>
                        )}
                      </>
                    ) : (
                      <Alert 
                        severity="success" 
                        icon={<CheckCircleIcon />}
                        sx={{
                          width: '100%',
                          bgcolor: 'rgba(0, 255, 136, 0.1)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          color: '#00ff88'
                        }}
                      >
                        Image confirmed! Ready to create your function.
                      </Alert>
                    )}
                  </Stack>
                </Box>

                {/* Create Button */}
                {imageConfirmed && (
                  <Zoom in={true}>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      sx={{ 
                        mt: 2,
                        py: 2,
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        bgcolor: '#00ff88',
                        color: 'black',
                        boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)',
                        '&:hover': {
                          bgcolor: '#00dd77',
                          boxShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
                        }
                      }}
                    >
                      {loading ? 'Creating...' : formData.public_or_private === 'private' && selectedUsers.length > 0 
                        ? `Create & Invite ${selectedUsers.length} Friend${selectedUsers.length !== 1 ? 's' : ''} 🎉` 
                        : 'Create Function 🎉'}
                    </Button>
                  </Zoom>
                )}
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default CreateEventPage;