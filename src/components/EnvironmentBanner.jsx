import React from 'react';
import { ENV, CONFIG } from '../config/environment';

/**
 * EnvironmentBanner - Shows current environment warning/info
 * Only visible in pre-production and development modes
 */
const EnvironmentBanner = () => {
  // Don't show banner in production
  if (ENV.isProduction()) {
    return null;
  }

  const getBannerConfig = () => {
    if (ENV.isPreProduction()) {
      return {
        text: `⚠️ PRE-PRODUCTION MODE - Testing on ${CONFIG.BANNERS.network.toUpperCase()} testnet`,
        subtext: 'No real value should be at risk. For testing purposes only.',
        bgColor: '#FF9800', // Orange
        textColor: '#000000',
      };
    } else if (ENV.isDevelopment()) {
      return {
        text: `🔧 DEVELOPMENT MODE - ${CONFIG.BANNERS.network.toUpperCase()}`,
        subtext: 'Local development environment with mock data where applicable.',
        bgColor: '#2196F3', // Blue
        textColor: '#FFFFFF',
      };
    }
    return null;
  };

  const config = getBannerConfig();
  if (!config) return null;

  const styles = {
    banner: {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      backgroundColor: config.bgColor,
      color: config.textColor,
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: '9999',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    subtext: {
      display: 'block',
      fontSize: '12px',
      fontWeight: 'normal',
      marginTop: '4px',
      opacity: '0.9',
    },
  };

  return (
    <div style={styles.banner}>
      <div>{config.text}</div>
      <span style={styles.subtext}>{config.subtext}</span>
    </div>
  );
};

export default EnvironmentBanner;
