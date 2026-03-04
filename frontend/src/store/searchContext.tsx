import { createContext, useContext, useState, type ReactNode } from 'react';
import type { SearchParams } from '../lib/types';

interface SearchContextValue {
  lastSearch: SearchParams | null;
  setLastSearch: (params: SearchParams) => void;
  airlineFilter: string | null;
  setAirlineFilter: (airline: string | null) => void;
}

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [lastSearch, setLastSearch] = useState<SearchParams | null>(null);
  const [airlineFilter, setAirlineFilter] = useState<string | null>(null);

  return (
    <SearchContext.Provider
      value={{ lastSearch, setLastSearch, airlineFilter, setAirlineFilter }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchStore(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error('useSearchStore must be used within a SearchProvider');
  }
  return ctx;
}

