'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  HTMLAttributes,
  ButtonHTMLAttributes,
  forwardRef,
} from 'react';

/* =============================================================================
   TABS COMPONENT
   
   A compound component for tabbed interfaces. Supports controlled and 
   uncontrolled modes.
   
   @example
   <Tabs defaultValue="tab1">
     <TabsList>
       <TabsTrigger value="tab1">Tab 1</TabsTrigger>
       <TabsTrigger value="tab2">Tab 2</TabsTrigger>
     </TabsList>
     <TabsContent value="tab1">Content 1</TabsContent>
     <TabsContent value="tab2">Content 2</TabsContent>
   </Tabs>
============================================================================= */

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

/* -----------------------------------------------------------------------------
   Tabs Root
----------------------------------------------------------------------------- */

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  /** The default active tab (uncontrolled mode) */
  defaultValue?: string;
  /** The controlled value */
  value?: string;
  /** Callback when tab changes */
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

function Tabs({
  defaultValue = '',
  value: controlledValue,
  onValueChange,
  className = '',
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;
  
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={`w-full ${className}`} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* -----------------------------------------------------------------------------
   TabsList - Container for tab triggers
----------------------------------------------------------------------------- */

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={`
          inline-flex h-10 items-center justify-center rounded-lg 
          bg-muted p-1 gap-1
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

/* -----------------------------------------------------------------------------
   TabsTrigger - Individual tab button
----------------------------------------------------------------------------- */

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The value that identifies this tab */
  value: string;
  children: ReactNode;
}

const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', value, children, disabled, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        role="tab"
        type="button"
        aria-selected={isSelected}
        aria-controls={`tabpanel-${value}`}
        data-state={isSelected ? 'active' : 'inactive'}
        disabled={disabled}
        onClick={() => onValueChange(value)}
        className={`
          inline-flex items-center justify-center whitespace-nowrap rounded-md 
          px-3 py-1.5 text-sm font-medium transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          disabled:pointer-events-none disabled:opacity-50
          ${
            isSelected
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

/* -----------------------------------------------------------------------------
   TabsContent - Content panel for each tab
----------------------------------------------------------------------------- */

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  /** The value that identifies this tab content */
  value: string;
  /** Keep content mounted when inactive (default: false) */
  forceMount?: boolean;
  children: ReactNode;
}

const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', value, forceMount = false, children, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!forceMount && !isSelected) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`tabpanel-${value}`}
        aria-labelledby={`tab-${value}`}
        data-state={isSelected ? 'active' : 'inactive'}
        hidden={!isSelected}
        tabIndex={0}
        className={`
          mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          ${isSelected ? 'animate-fade-in' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };






