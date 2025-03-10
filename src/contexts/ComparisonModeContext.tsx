import { createContext, useState, ReactNode } from 'react';

interface ComparisonModeContextType {
  comparisonMode: boolean;
  setComparisonMode: (mode: boolean) => void;
}

export const ComparisonModeContext = createContext<ComparisonModeContextType>({
  comparisonMode: false,
  setComparisonMode: () => {},
});

interface ComparisonModeProviderProps {
  children: ReactNode;
}

export function ComparisonModeProvider({ children }: ComparisonModeProviderProps) {
  const [comparisonMode, setComparisonMode] = useState(false);

  return (
    <ComparisonModeContext.Provider value={{ comparisonMode, setComparisonMode }}>
      {children}
    </ComparisonModeContext.Provider>
  );
} 