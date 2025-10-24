import React from 'react';
import { Box, styled } from '@mui/material';
import { glassMorphism } from '../../styles/theme';

const GlassCardContainer = styled(Box)({
  ...glassMorphism,
  padding: '2rem',
  borderRadius: '16px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 8px 32px 0 rgba(57, 255, 20, 0.2)',
  },
});

const GlassCard = ({ children, sx = {}, ...props }) => {
  return (
    <GlassCardContainer sx={sx} {...props}>
      {children}
    </GlassCardContainer>
  );
};

export default GlassCard;
