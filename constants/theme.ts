export const Colors = {
  // Brand
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',

  // Surface
  background: '#F0F4F8',
  backgroundGradientEnd: '#E2E8F0',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#FFFFFF',

  // State
  success: '#059669',
  successLight: '#D1FAE5',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  disabled: '#94A3B8',
  disabledText: '#CBD5E1',

  // Numpad
  numpadBg: '#FFFFFF',
  numpadPressed: '#EFF6FF',
  numpadBorder: '#E2E8F0',
  numpadText: '#1E293B',

  // Input display
  inputBg: '#FFFFFF',
  inputBorder: '#2563EB',
  inputActive: '#2563EB',

  // Card
  cardShadow: 'rgba(0,0,0,0.08)',
};

export const Typography = {
  // Sizes
  giant: 48,
  heading1: 36,
  heading2: 28,
  heading3: 22,
  body: 18,
  bodyLarge: 20,
  caption: 15,
  small: 13,

  // Weights
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  button: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
};
