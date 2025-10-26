import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Backend API URL
const API_URL = 'http://127.0.0.1:8000/api';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Call your FastAPI login endpoint
      const response = await axios.post(`${API_URL}/users/login`, null, {
        params: {
          bc_email: email,
          password: password
        }
      });

      const userData = response.data;
      
      // Store user data
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Login failed. Please check your credentials.'
      };
    }
  };

  const register = async (email, password, name) => {
    try {
      // Call your FastAPI register endpoint (no alias yet)
      const response = await axios.post(`${API_URL}/users/register`, {
        bc_email: email,
        password: password,
        name: name
      });

      const userData = response.data;
      
      // DON'T auto-login yet - need to generate alias first
      return { success: true, user: userData, needsAlias: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Registration failed. Please try again.'
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;