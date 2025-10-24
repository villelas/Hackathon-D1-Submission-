import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import { glassMorphism, neonText } from '../../styles/theme';
import { motion } from 'framer-motion';

const MotionTypography = motion(Typography);

const titleVariants = {
  hidden: { 
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    }
  },
  hover: {
    scale: 1.02,
    textShadow: '0 0 10px rgba(57, 255, 20, 0.7)',
    transition: {
      duration: 0.3,
      yoyo: Infinity,
      ease: 'easeInOut'
    }
  }
};

const StyledAppBar = styled(AppBar)({
  ...glassMorphism,
  borderBottom: '1px solid rgba(57, 255, 20, 0.3)',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
});

const ContentContainer = styled(Container)({
  paddingTop: '2rem',
  paddingBottom: '4rem',
  minHeight: 'calc(100vh - 64px)',
});

export const MainLayout = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
      <StyledAppBar position="static" color="transparent">
        <Toolbar>
          <MotionTypography
            variant="h6"
            component={motion.div}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            variants={titleVariants}
            sx={{ 
              flexGrow: 1,
              cursor: 'default',
              display: 'inline-block',
              '&:hover': {
                ...neonText
              }
            }}
          >
            BCPlugHub
          </MotionTypography>
          <Button color="primary" variant="contained">
            Login with BC Email
          </Button>
        </Toolbar>
      </StyledAppBar>
      
      <ContentContainer maxWidth="lg">
        {children}
      </ContentContainer>
    </Box>
  );
};

export default MainLayout;
