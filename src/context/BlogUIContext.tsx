'use client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { BlogUIComponents } from '../types/ui-components';
import { defaultComponents } from '../components/ui';

const BlogUIContext = createContext<BlogUIComponents | null>(null);

export interface BlogThemeProviderProps {
  components?: Partial<BlogUIComponents>;
  children: ReactNode;
}

export function BlogThemeProvider({ components, children }: BlogThemeProviderProps) {
  const merged = useMemo(
    () => ({ ...defaultComponents, ...components }),
    [components],
  );
  return (
    <BlogUIContext.Provider value={merged}>
      {children}
    </BlogUIContext.Provider>
  );
}

export function useBlogUI(): BlogUIComponents {
  const ctx = useContext(BlogUIContext);
  return ctx ?? defaultComponents;
}
