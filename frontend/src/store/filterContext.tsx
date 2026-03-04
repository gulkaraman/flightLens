import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FilterState, SortMode } from '../lib/types';

interface FilterContextValue {
  state: FilterState;
  setState: (next: FilterState) => void;
  update: (partial: Partial<FilterState>) => void;
  setSortBy: (mode: SortMode) => void;
}

const defaultState: FilterState = {
  sortBy: 'priceAsc',
  directOnly: false,
  airlines: []
};

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FilterState>(defaultState);

  const update = (partial: Partial<FilterState>) =>
    setState((prev) => ({
      ...prev,
      ...partial
    }));

  const setSortBy = (mode: SortMode) => update({ sortBy: mode });

  return (
    <FilterContext.Provider value={{ state, setState, update, setSortBy }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilterStore(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) {
    throw new Error('useFilterStore must be used within a FilterProvider');
  }
  return ctx;
}

