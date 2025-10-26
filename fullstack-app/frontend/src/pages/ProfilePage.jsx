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
  AppBar,
  Toolbar,
  CircularProgress
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
      // First save the handle
      await axios.put(`${API_URL}/users/${user.user_id}/instagram`, {
        instagram_handle: instagramHandle,
        instagram_followers: []
      });
      
      setSuccess('Syncing followers... This may take a minute.');
      
      // Then scrape followers
      const response = await axios.post(
        `${API_URL}/users/${user.user_id}/instagram/scrape`,
        { 
          instagram_handle: instagramHandle,
          max_followers: 100  // Limit for safety
        }
      );
      
      setFollowersList(response.data.followers || []);
      setUserStats(prev => ({
        ...prev,
        instagram_follower_count: response.data.total_followers
      }));
      
      setSuccess(`✅ Synced ${response.data.followers_count} followers! (${response.data.total_followers} total)`);
      setTimeout(() => setSuccess(''), 5000);
      
      // Refresh profile data
      fetchUserProfile();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to sync Instagram';
      setError(errorMsg);
      
      // If rate limited, show helpful message
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
    if (rating >= 8) return '#4caf50';
    if (rating >= 4) return '#ff9800';
    return '#f44336';
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Top Bar */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Profile
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Header Card with Avatar & Alias */}
        <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
          <Avatar 
            sx={{ 
              width: 120, 
              height: 120, 
              margin: '0 auto 16px',
              fontSize: '3rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
          >
            {user?.name?.charAt(0)}
          </Avatar>
          
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            {user?.ai_generated_alias || 'Loading...'}
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {user?.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            {user?.bc_email}
          </Typography>
        </Paper>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <StarIcon sx={{ fontSize: 40, color: getRatingColor(userStats.personal_rating) }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: getRatingColor(userStats.personal_rating) }}>
                  {userStats.personal_rating.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Host Rating
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <EmojiEventsIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {userStats.past_functions_count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Functions Hosted
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <InstagramIcon sx={{ fontSize: 40, color: '#E1306C' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {userStats.instagram_follower_count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  IG Followers
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Instagram Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InstagramIcon sx={{ color: '#E1306C' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Instagram Connection
              </Typography>
            </Box>
            {!editingInstagram ? (
              <IconButton size="small" onClick={() => setEditingInstagram(true)}>
                <EditIcon />
              </IconButton>
            ) : (
              <Box>
                <IconButton size="small" onClick={() => setEditingInstagram(false)}>
                  <CancelIcon />
                </IconButton>
                <IconButton size="small" color="primary" onClick={handleSaveInstagram} disabled={loading}>
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
                sx={{ mb: 2 }}
              />
              <Button 
                variant="contained" 
                startIcon={syncingInstagram ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
                onClick={handleSyncInstagram}
                disabled={loading || syncingInstagram || !instagramHandle.trim()}
                fullWidth
                sx={{ 
                  background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                  color: 'white',
                  '&:hover': {
                    opacity: 0.9
                  }
                }}
              >
                {syncingInstagram ? 'Syncing Followers...' : 'Sync Instagram Followers'}
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" color={instagramHandle ? 'text.primary' : 'text.secondary'} sx={{ mb: 2 }}>
                {instagramHandle || 'No Instagram connected'}
              </Typography>
              
              {followersList.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Synced Followers ({followersList.length}):
                  </Typography>
                  <Box sx={{ 
                    mt: 1, 
                    p: 2, 
                    bgcolor: 'grey.100', 
                    borderRadius: 1,
                    maxHeight: 150,
                    overflow: 'auto'
                  }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {followersList.slice(0, 20).map((follower, index) => (
                        <Chip 
                          key={index}
                          label={`@${follower}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {followersList.length > 20 && (
                        <Chip 
                          label={`+${followersList.length - 20} more`}
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Clubs Section */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupsIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                BC Clubs & Organizations
              </Typography>
            </Box>
            {!editingClubs ? (
              <IconButton size="small" onClick={() => setEditingClubs(true)}>
                <EditIcon />
              </IconButton>
            ) : (
              <Box>
                <IconButton size="small" onClick={() => setEditingClubs(false)}>
                  <CancelIcon />
                </IconButton>
                <IconButton size="small" color="primary" onClick={handleSaveClubs} disabled={loading}>
                  <SaveIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {editingClubs && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Add Club"
                placeholder="e.g., UGBC, Finance Club, Ski Team"
                value={newClub}
                onChange={(e) => setNewClub(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddClub()}
              />
              <Button variant="contained" onClick={handleAddClub}>
                Add
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {clubs.length > 0 ? (
              clubs.map((club, index) => (
                <Chip
                  key={index}
                  label={club}
                  onDelete={editingClubs ? () => handleRemoveClub(club) : undefined}
                  color="primary"
                  variant="outlined"
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                No clubs added yet
              </Typography>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default ProfilePage;