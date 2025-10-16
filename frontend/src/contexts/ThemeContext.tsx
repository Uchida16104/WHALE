import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ThemeType = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'elderly' | 'highContrast';

interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
}

interface ThemeContextType {
  themeType: ThemeType;
  theme: ThemeColors;
  setThemeType: (type: ThemeType) => void;
}

const themes: Record<ThemeType, ThemeColors> = {
  default: {
    background: 'bg-gray-50',
    card: 'bg-white',
    cardAlt: 'bg-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    accent: 'bg-green-600',
    border: 'border-gray-300'
  },
  protanopia: {
    background: 'bg-gray-50',
    card: 'bg-white',
    cardAlt: 'bg-blue-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    primary: 'bg-blue-700',
    secondary: 'bg-yellow-600',
    accent: 'bg-blue-500',
    border: 'border-blue-300'
  },
  deuteranopia: {
    background: 'bg-gray-50',
    card: 'bg-white',
    cardAlt: 'bg-blue-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    primary: 'bg-blue-700',
    secondary: 'bg-yellow-600',
    accent: 'bg-purple-600',
    border: 'border-blue-300'
  },
  tritanopia: {
    background: 'bg-gray-50',
    card: 'bg-white',
    cardAlt: 'bg-red-50',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    primary: 'bg-red-600',
    secondary: 'bg-cyan-600',
    accent: 'bg-pink-600',
    border: 'border-red-300'
  },
  elderly: {
    background: 'bg-yellow-50',
    card: 'bg-white',
    cardAlt: 'bg-yellow-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-800',
    primary: 'bg-orange-600',
    secondary: 'bg-blue-700',
    accent: 'bg-green-700',
    border: 'border-orange-400'
  },
  highContrast: {
    background: 'bg-black',
    card: 'bg-gray-900',
    cardAlt: 'bg-gray-800',
    text: 'text-white',
    textSecondary: 'text-gray-300',
    primary: 'bg-yellow-400',
    secondary: 'bg-cyan-400',
    accent: 'bg-lime-400',
    border: 'border-white'
  }
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeType, setThemeTypeState] = useState<ThemeType>('default');

  useEffect(() => {
    const storedTheme = localStorage.getItem('whale_theme') as ThemeType;
    if (storedTheme && themes[storedTheme]) {
      setThemeTypeState(storedTheme);
    }
  }, []);

  const setThemeType = (type: ThemeType) => {
    setThemeTypeState(type);
    localStorage.setItem('whale_theme', type);
  };

  const value: ThemeContextType = {
    themeType,
    theme: themes[themeType],
    setThemeType
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
