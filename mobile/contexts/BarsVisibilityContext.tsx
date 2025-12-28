import React, { createContext, useContext, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface BarsVisibilityContextValue {
  headerAnimatedValue: Animated.Value;
  tabBarAnimatedValue: Animated.Value;
  setHeaderVisible: (visible: boolean) => void;
  setTabBarVisible: (visible: boolean) => void;
}

const BarsVisibilityContext = createContext<BarsVisibilityContextValue | undefined>(undefined);

export function BarsVisibilityProvider({ children }: { children: React.ReactNode }) {
  const headerAnimatedValue = useRef(new Animated.Value(1)).current; // 1 = visible, 0 = hidden
  const tabBarAnimatedValue = useRef(new Animated.Value(1)).current;

  const setHeaderVisible = (visible: boolean) => {
    Animated.timing(headerAnimatedValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const setTabBarVisible = (visible: boolean) => {
    Animated.timing(tabBarAnimatedValue, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <BarsVisibilityContext.Provider
      value={{
        headerAnimatedValue,
        tabBarAnimatedValue,
        setHeaderVisible,
        setTabBarVisible,
      }}
    >
      {children}
    </BarsVisibilityContext.Provider>
  );
}

export function useBarsVisibility() {
  const context = useContext(BarsVisibilityContext);
  if (!context) {
    throw new Error('useBarsVisibility must be used within BarsVisibilityProvider');
  }
  return context;
}



