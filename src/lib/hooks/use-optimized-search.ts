import { useState, useEffect, useMemo } from 'react';
import { useDebouncedValue } from './use-debounced-value';

/**
 * Optimized search hook with debouncing and memoization
 */
export function useOptimizedSearch<T>(
  items: T[],
  searchQuery: string,
  searchKeys: (keyof T)[],
  debounceMs: number = 300
) {
  const debouncedSearch = useDebouncedValue(searchQuery, debounceMs);

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;

    const query = debouncedSearch.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        return false;
      })
    );
  }, [items, debouncedSearch, searchKeys]);

  return {
    filteredItems,
    isSearching: searchQuery !== debouncedSearch,
  };
}
