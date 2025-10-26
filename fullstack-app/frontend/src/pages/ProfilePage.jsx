import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Grid,
  Divider,
  IconButton,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Fade,
  Tooltip
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import InstagramIcon from '@mui/icons-material/Instagram';
import GroupsIcon from '@mui/icons-material/Groups';
import StarIcon from '@mui/icons-material/Star';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SyncIcon from '@mui/icons-material/Sync';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

const API_URL = 'http://127.0.0.1:8000/api';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Form states
  const [instagramHandle, setInstagramHandle] = useState('');
  const [followersList, setFollowersList] = useState([]);
  const [newClub, setNewClub] = useState('');
  const [clubs, setClubs] = useState([]);
  const [bio, setBio] = useState('');
  const [yearAtBC, setYearAtBC] = useState('');
  
  // UI states
  const [editingInstagram, setEditingInstagram] = useState(false);
  const [editingClubs, setEditingClubs] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncingInstagram, setSyncingInstagram] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // User stats
  const [userStats, setUserStats] = useState({
    personal_rating: 5,
    past_functions_count: 0,
    current_functions_count: 0,
    instagram_follower_count: 0
  });

  useEffect(() => {
    if (user?.user_id) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/${user.user_id}`);
      const userData = response.data;
      
      setInstagramHandle(userData.instagram_handle || '');
      setFollowersList(userData.instagram_followers || []);
      setClubs(userData.bc_club_affiliations || []);
      setBio(userData.bio || '');
      setYearAtBC(userData.year_at_bc || '');
      setUserStats({
        personal_rating: userData.personal_rating || 5,
        past_functions_count: userData.past_functions?.length || 0,
        current_functions_count: userData.current_functions?.length || 0,
        instagram_follower_count: userData.instagram_follower_count || userData.instagram_followers?.length || 0
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const handleSaveInstagram = async () => {
    if (!instagramHandle.trim()) {
      setError('Instagram handle cannot be empty');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await axios.put(`${API_URL}/users/${user.user_id}/instagram`, {
        instagram_handle: instagramHandle,
        instagram_followers: followersList
      });
      
      setSuccess('Instagram updated successfully!');
      setEditingInstagram(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update Instagram');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInstagram = async () => {
    if (!instagramHandle.trim()) {
      setError('Enter your Instagram handle first');
      return;
    }

    setSyncingInstagram(true);
    setError('');
    
    try {
      await axios.put(`${API_URL}/users/${user.user_id}/instagram`, {
        instagram_handle: instagramHandle,
        instagram_followers: []
      });
      
      setSuccess('Syncing followers... This may take a minute.');
      
      const response = await axios.post(
        `${API_URL}/users/${user.user_id}/instagram/scrape`,
        { 
          instagram_handle: instagramHandle,
          max_followers: 100
        }
      );
      
      setFollowersList(response.data.followers || []);
      setUserStats(prev => ({
        ...prev,
        instagram_follower_count: response.data.total_followers
      }));
      
      setSuccess(`✅ Synced ${response.data.followers_count} followers! (${response.data.total_followers} total)`);
      setTimeout(() => setSuccess(''), 5000);
      
      fetchUserProfile();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to sync Instagram';
      setError(errorMsg);
      
      if (err.response?.status === 429) {
        setError('Instagram rate limit hit. Please try again in 10 minutes. ⏰');
      }
    } finally {
      setSyncingInstagram(false);
    }
  };

  const handleAddClub = () => {
    if (newClub.trim() && !clubs.includes(newClub.trim())) {
      setClubs([...clubs, newClub.trim()]);
      setNewClub('');
    }
  };

  const handleRemoveClub = (clubToRemove) => {
    setClubs(clubs.filter(club => club !== clubToRemove));
  };

  const handleSaveClubs = async () => {
    setLoading(true);
    setError('');
    
    try {
      await axios.put(`${API_URL}/users/${user.user_id}/clubs`, {
        bc_club_affiliations: clubs
      });
      
      setSuccess('Clubs updated successfully!');
      setEditingClubs(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update clubs');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 8) return '#00ff88';
    if (rating >= 4) return '#ffd93d';
    return '#ff6b9d';
  };

  const getRatingLabel = (rating) => {
    if (rating >= 9) return 'Legendary';
    if (rating >= 8) return 'Elite';
    if (rating >= 6) return 'Rising Star';
    if (rating >= 4) return 'Building Rep';
    return 'New Host';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: '#000000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(0, 255, 136, 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 8s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-40px)' }
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '5%',
          left: '5%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255, 217, 61, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          animation: 'float 10s ease-in-out infinite',
        }}
      />

      {/* Back Button */}
      <Box sx={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <IconButton
          onClick={() => navigate('/dashboard')}
          sx={{
            color: 'white',
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            '&:hover': {
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.5)',
            }
          }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Box>

      <Container maxWidth="lg" sx={{ py: 8, position: 'relative', zIndex: 1 }}>
        {/* Alerts */}
        {success && (
          <Fade in>
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                background: 'rgba(0, 255, 136, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 255, 136, 0.3)',
                color: '#00ff88'
              }}
            >
              {success}
            </Alert>
          </Fade>
        )}
        {error && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                background: 'rgba(255, 107, 157, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 107, 157, 0.3)',
                color: '#ff6b9d'
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* Header Card with Avatar & Alias */}
        <Box
          sx={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 4,
            p: 5,
            mb: 4,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Glow effect behind avatar */}
          <Box
            sx={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(0, 255, 136, 0.3) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(40px)',
              zIndex: 0
            }}
          />

          <Avatar 
            sx={{ 
              width: 140, 
              height: 140, 
              margin: '0 auto 20px',
              fontSize: '3.5rem',
              background: 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)',
              border: '4px solid rgba(0, 255, 136, 0.3)',
              boxShadow: '0 0 40px rgba(0, 255, 136, 0.4)',
              position: 'relative',
              zIndex: 1
            }}
          >
            {user?.name?.charAt(0)}
          </Avatar>
          
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 900, 
              mb: 1,
              color: '#00ff88',
              textShadow: '0 0 30px rgba(0, 255, 136, 0.5)',
              position: 'relative',
              zIndex: 1
            }}
          >
            {user?.ai_generated_alias || 'Loading...'}
          </Typography>
          
          <Typography variant="h5" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1, fontWeight: 600 }}>
            {user?.name}
          </Typography>
          
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            {user?.bc_email}
          </Typography>

          {/* Rating Badge */}
          <Box sx={{ mt: 3 }}>
            <Chip
              icon={<LocalFireDepartmentIcon />}
              label={getRatingLabel(userStats.personal_rating)}
              sx={{
                background: `linear-gradient(135deg, ${getRatingColor(userStats.personal_rating)} 0%, ${getRatingColor(userStats.personal_rating)}cc 100%)`,
                color: '#000',
                fontWeight: 800,
                fontSize: '1rem',
                px: 2,
                py: 2.5,
                height: 'auto',
                border: `2px solid ${getRatingColor(userStats.personal_rating)}`,
                boxShadow: `0 0 30px ${getRatingColor(userStats.personal_rating)}40`
              }}
            />
          </Box>
        </Box>

        {/* Stats Grid - Redesigned */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 255, 136, 0.2)',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  border: '1px solid rgba(0, 255, 136, 0.5)',
                  boxShadow: `0 12px 40px ${getRatingColor(userStats.personal_rating)}30`
                }
              }}
            >
              <StarIcon sx={{ 
                fontSize: 48, 
                color: getRatingColor(userStats.personal_rating),
                filter: `drop-shadow(0 0 20px ${getRatingColor(userStats.personal_rating)})`
              }} />
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 900, 
                  color: getRatingColor(userStats.personal_rating),
                  mt: 2,
                  textShadow: `0 0 20px ${getRatingColor(userStats.personal_rating)}80`
                }}
              >
                {userStats.personal_rating.toFixed(1)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, fontWeight: 600 }}>
                Host Rating
              </Typography>
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(userStats.personal_rating / 10) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: getRatingColor(userStats.personal_rating),
                      boxShadow: `0 0 10px ${getRatingColor(userStats.personal_rating)}`
                    }
                  }}
                />
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 217, 61, 0.2)',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  border: '1px solid rgba(255, 217, 61, 0.5)',
                  boxShadow: '0 12px 40px rgba(255, 217, 61, 0.3)'
                }
              }}
            >
              <EmojiEventsIcon sx={{ 
                fontSize: 48, 
                color: '#ffd93d',
                filter: 'drop-shadow(0 0 20px rgba(255, 217, 61, 0.6))'
              }} />
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 900, 
                  color: '#ffd93d',
                  mt: 2,
                  textShadow: '0 0 20px rgba(255, 217, 61, 0.5)'
                }}
              >
                {userStats.past_functions_count}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, fontWeight: 600 }}>
                Functions Hosted
              </Typography>
              {userStats.current_functions_count > 0 && (
                <Chip 
                  label={`${userStats.current_functions_count} Active`}
                  size="small"
                  sx={{ 
                    mt: 2,
                    background: 'rgba(255, 217, 61, 0.2)',
                    color: '#ffd93d',
                    border: '1px solid rgba(255, 217, 61, 0.3)',
                    fontWeight: 700
                  }}
                />
              )}
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box
              sx={{
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(225, 48, 108, 0.2)',
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  border: '1px solid rgba(225, 48, 108, 0.5)',
                  boxShadow: '0 12px 40px rgba(225, 48, 108, 0.3)'
                }
              }}
            >
              <InstagramIcon sx={{ 
                fontSize: 48, 
                color: '#E1306C',
                filter: 'drop-shadow(0 0 20px rgba(225, 48, 108, 0.6))'
              }} />
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 900, 
                  color: '#E1306C',
                  mt: 2,
                  textShadow: '0 0 20px rgba(225, 48, 108, 0.5)'
                }}
              >
                {userStats.instagram_follower_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 1, fontWeight: 600 }}>
                Instagram Followers
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Instagram Section - Enhanced */}
        <Box
          sx={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(225, 48, 108, 0.2)',
            borderRadius: 3,
            p: 4,
            mb: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <InstagramIcon sx={{ color: '#E1306C', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                Instagram Connection
              </Typography>
            </Box>
            {!editingInstagram ? (
              <Tooltip title="Edit Instagram">
                <IconButton 
                  size="medium" 
                  onClick={() => setEditingInstagram(true)}
                  sx={{
                    color: '#E1306C',
                    background: 'rgba(225, 48, 108, 0.1)',
                    border: '1px solid rgba(225, 48, 108, 0.3)',
                    '&:hover': {
                      background: 'rgba(225, 48, 108, 0.2)',
                    }
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  size="medium" 
                  onClick={() => setEditingInstagram(false)}
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <CancelIcon />
                </IconButton>
                <IconButton 
                  size="medium" 
                  onClick={handleSaveInstagram} 
                  disabled={loading}
                  sx={{ color: '#00ff88' }}
                >
                  <SaveIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {editingInstagram ? (
            <Box>
              <TextField
                fullWidth
                label="Instagram Handle"
                placeholder="@username"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                disabled={loading || syncingInstagram}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(225, 48, 108, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#E1306C',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
              <Button 
                variant="contained" 
                startIcon={syncingInstagram ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                onClick={handleSyncInstagram}
                disabled={loading || syncingInstagram || !instagramHandle.trim()}
                fullWidth
                sx={{ 
                  py: 1.5,
                  background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1rem',
                  '&:hover': {
                    opacity: 0.9,
                    transform: 'translateY(-2px)',
                  },
                  '&:disabled': {
                    opacity: 0.5
                  },
                  transition: 'all 0.2s'
                }}
              >
                {syncingInstagram ? 'Syncing Followers...' : 'Sync Instagram Followers'}
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" sx={{ color: instagramHandle ? '#00ff88' : 'rgba(255, 255, 255, 0.4)', mb: 2, fontWeight: 600 }}>
                {instagramHandle || 'No Instagram connected'}
              </Typography>
              
              {followersList.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Synced Followers ({followersList.length}):
                  </Typography>
                  <Box sx={{ 
                    mt: 2, 
                    p: 3, 
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    maxHeight: 200,
                    overflow: 'auto',
                    '&::-webkit-scrollbar': {
                      width: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: '10px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: 'rgba(225, 48, 108, 0.5)',
                      borderRadius: '10px',
                    },
                  }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {followersList.slice(0, 30).map((follower, index) => (
                        <Chip 
                          key={index}
                          label={`@${follower}`}
                          size="small"
                          sx={{
                            background: 'rgba(225, 48, 108, 0.1)',
                            color: '#E1306C',
                            border: '1px solid rgba(225, 48, 108, 0.3)',
                            fontWeight: 600
                          }}
                        />
                      ))}
                      {followersList.length > 30 && (
                        <Chip 
                          label={`+${followersList.length - 30} more`}
                          size="small"
                          sx={{
                            background: 'rgba(0, 255, 136, 0.1)',
                            color: '#00ff88',
                            border: '1px solid rgba(0, 255, 136, 0.3)',
                            fontWeight: 700
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>

        {/* Clubs Section - Enhanced */}
        <Box
          sx={{
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 136, 0.2)',
            borderRadius: 3,
            p: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <GroupsIcon sx={{ color: '#00ff88', fontSize: 32 }} />
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                BC Clubs & Organizations
              </Typography>
            </Box>
            {!editingClubs ? (
              <Tooltip title="Edit Clubs">
                <IconButton 
                  size="medium" 
                  onClick={() => setEditingClubs(true)}
                  sx={{
                    color: '#00ff88',
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    '&:hover': {
                      background: 'rgba(0, 255, 136, 0.2)',
                    }
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton 
                  size="medium" 
                  onClick={() => setEditingClubs(false)}
                  sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                >
                  <CancelIcon />
                </IconButton>
                <IconButton 
                  size="medium" 
                  onClick={handleSaveClubs} 
                  disabled={loading}
                  sx={{ color: '#00ff88' }}
                >
                  <SaveIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {editingClubs && (
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField
                fullWidth
                size="medium"
                label="Add Club"
                placeholder="e.g., UGBC, Finance Club, Ski Team"
                value={newClub}
                onChange={(e) => setNewClub(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddClub()}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 255, 136, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#00ff88',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255, 255, 255, 0.6)',
                  },
                }}
              />
              <Button 
                variant="contained" 
                onClick={handleAddClub}
                sx={{
                  px: 4,
                  background: 'linear-gradient(135deg, #00ff88 0%, #00d4aa 100%)',
                  color: '#000',
                  fontWeight: 800,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #00d4aa 0%, #00ff88 100%)',
                    transform: 'translateY(-2px)',
                  }
                }}
              >
                Add
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {clubs.length > 0 ? (
              clubs.map((club, index) => (
                <Chip
                  key={index}
                  label={club}
                  onDelete={editingClubs ? () => handleRemoveClub(club) : undefined}
                  sx={{
                    background: 'rgba(0, 255, 136, 0.15)',
                    color: '#00ff88',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    px: 1,
                    py: 2.5,
                    '& .MuiChip-deleteIcon': {
                      color: '#ff6b9d',
                      '&:hover': {
                        color: '#ff3366'
                      }
                    }
                  }}
                />
              ))
            ) : (
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.4)', py: 2 }}>
                No clubs added yet. Add your BC clubs and organizations!
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default ProfilePage;