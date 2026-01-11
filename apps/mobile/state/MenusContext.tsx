import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MenusState = {
  isLeftOpen: boolean;
  isRightOpen: boolean;
  openLeft: () => void;
  closeLeft: () => void;
  openRight: () => void;
  closeRight: () => void;
  closeAll: () => void;
};

const MenusContext = createContext<MenusState | null>(null);

export function MenusProvider({ children }: { children: React.ReactNode }) {
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  const closeLeft = useCallback(() => setIsLeftOpen(false), []);
  const closeRight = useCallback(() => setIsRightOpen(false), []);

  const value = useMemo<MenusState>(
    () => ({
      isLeftOpen,
      isRightOpen,
      openLeft: () => setIsLeftOpen(true),
      closeLeft,
      openRight: () => setIsRightOpen(true),
      closeRight,
      closeAll: () => {
        closeLeft();
        closeRight();
      },
    }),
    [closeLeft, closeRight, isLeftOpen, isRightOpen]
  );

  return <MenusContext.Provider value={value}>{children}</MenusContext.Provider>;
}

export function useMenus() {
  const ctx = useContext(MenusContext);
  if (!ctx) throw new Error('useMenus must be used within MenusProvider');
  return ctx;
}

