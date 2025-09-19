// Design Tokens for Patient Health Monitoring Dashboard
// Based on the reference image specifications

export const designTokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#0b74ff', // Main primary blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e', // Main success green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning orange
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main danger red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    neutral: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    }
  },
  
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '0.75rem',    // 12px
    lg: '1rem',       // 16px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '2rem',    // 32px
    '4xl': '2.5rem',  // 40px
    '5xl': '3rem',    // 48px
    '6xl': '4rem',    // 64px
  },
  
  borderRadius: {
    sm: '0.375rem',   // 6px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    '2xl': '1.5rem',  // 24px
    full: '9999px',
  },
  
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 4px 10px rgba(0, 0, 0, 0.05)', // Main card shadow
    xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 0 1px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.3)', // For critical alerts
  },
  
  typography: {
    fontFamily: {
      sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Component-specific tokens
  components: {
    sidebar: {
      width: '240px',
      widthCollapsed: '64px',
    },
    card: {
      padding: '1rem',
      borderRadius: '0.75rem', // 12px
      shadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
    },
    vitalsCard: {
      height: '140px',
      valueSize: '2rem', // 32px
      unitSize: '0.875rem', // 14px
    },
    statusTag: {
      borderRadius: '9999px',
      padding: '0.25rem 0.75rem',
      fontSize: '0.75rem',
      fontWeight: '500',
    }
  },
  
  // Status thresholds (configurable)
  thresholds: {
    heartRate: { min: 60, max: 100 },
    spo2: { min: 95, max: 100 },
    bodyTemp: { min: 36.1, max: 37.2 },
    ambientTemp: { min: 15, max: 35 },
    accMagnitude: { min: 0.5, max: 2.0 },
  },
  
  // Icons mapping
  icons: {
    heartRate: '❤️',
    spo2: '🫁',
    bodyTemp: '🌡️',
    ambientTemp: '🌡️',
    accMagnitude: '📊',
    fallDetected: '⚠️',
    dashboard: '🏠',
    liveMonitoring: '📡',
    alerts: '🔔',
    profile: '👤',
    settings: '⚙️',
    history: '🕓',
    logout: '🚪',
    emergency: '🚨',
    notifications: '🔔',
    online: '🟢',
    offline: '🔴',
  }
};

// Status evaluation function
export const evaluateStatus = (value, thresholds) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'unknown';
  }
  
  if (value < thresholds.min || value > thresholds.max) {
    return 'critical';
  }
  
  // Add warning zone (10% buffer)
  const range = thresholds.max - thresholds.min;
  const warningBuffer = range * 0.1;
  
  if (value < (thresholds.min + warningBuffer) || value > (thresholds.max - warningBuffer)) {
    return 'warning';
  }
  
  return 'normal';
};

// Status color mapping
export const getStatusColors = (status) => {
  const colors = {
    normal: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-300',
      pill: 'bg-green-500 text-white'
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800', 
      border: 'border-yellow-300',
      pill: 'bg-yellow-500 text-white'
    },
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      pill: 'bg-red-500 text-white'
    },
    unknown: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-300',
      pill: 'bg-gray-500 text-white'
    }
  };
  
  return colors[status] || colors.unknown;
};

