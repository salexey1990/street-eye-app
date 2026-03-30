import { Platform } from 'react-native';

export const theme = {
  colors: {
    bg:             '#1C1C1E',
    bgSurface:      '#2C2C2E',
    bgElevated:     '#3A3A3C',
    text:           '#FFFFFF',
    textSecondary:  'rgba(235,235,245,0.6)',
    textMuted:      'rgba(235,235,245,0.3)',
    textDisabled:   'rgba(235,235,245,0.18)',
    accent:         '#9B51E0',
    accentPressed:  '#7B3DB8',
    separator:      'rgba(235,235,245,0.15)',
    iconMuted:      'rgba(235,235,245,0.4)',
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  radius: {
    sm:   8,
    md:   12,
    lg:   16,
    pill: 100,
  },
  font: {
    family: Platform.OS === 'ios' ? 'System' : 'Roboto',
    displayLg:  { fontSize: 28, fontWeight: '700' as const },
    displaySm:  { fontSize: 16, fontWeight: '400' as const },
    label:      { fontSize: 15, fontWeight: '400' as const },
    body:       { fontSize: 17, fontWeight: '400' as const },
    bodySmall:  { fontSize: 15, fontWeight: '400' as const },
    link:       { fontSize: 15, fontWeight: '600' as const },
    button:     { fontSize: 17, fontWeight: '700' as const },
  },
};

// Backward-compat alias для существующих компонентов
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#9B51E0',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#9B51E0',
  },
  dark: {
    text: '#FFFFFF',
    background: '#1C1C1E',
    tint: '#9B51E0',
    icon: 'rgba(235,235,245,0.4)',
    tabIconDefault: 'rgba(235,235,245,0.4)',
    tabIconSelected: '#9B51E0',
  },
};
