// utils/WalkthroughContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from 'react';

interface WalkthroughContextType {
  stepIndex: number;
  setStepIndex: (index: number) => void;
  runTour: boolean;
  setRunTour: (run: boolean) => void;
  joyrideHelpers: any;
  setJoyrideHelpers: (helpers: any) => void;
  triggerNext: () => void;
}

const WalkthroughContext = createContext<WalkthroughContextType | undefined>(
  undefined
);

export const WalkthroughProvider = ({ children }: { children: ReactNode }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [runTour, setRunTour] = useState(false);
  const joyrideHelpersRef = useRef<any>(null);

  console.log('stepIndex', stepIndex);

  // Use a ref instead of state to avoid re-renders
  const setJoyrideHelpers = useCallback((helpers: any) => {
    joyrideHelpersRef.current = helpers;
  }, []);

  // Function to trigger next step - memoized to avoid recreating on each render
  const triggerNext = useCallback(() => {
    if (joyrideHelpersRef.current) {
      console.log('Programmatically triggering next step in walkthrough');
      joyrideHelpersRef.current.next();
    } else {
      console.warn('Cannot trigger next step: joyrideHelpers not set');
    }
  }, []);

  return (
    <WalkthroughContext.Provider
      value={{
        stepIndex,
        setStepIndex,
        runTour,
        setRunTour,
        joyrideHelpers: joyrideHelpersRef.current,
        setJoyrideHelpers,
        triggerNext,
      }}
    >
      {children}
    </WalkthroughContext.Provider>
  );
};

export const useWalkthrough = () => {
  const context = useContext(WalkthroughContext);
  if (!context) {
    throw new Error('useWalkthrough must be used within a WalkthroughProvider');
  }
  return context;
};
