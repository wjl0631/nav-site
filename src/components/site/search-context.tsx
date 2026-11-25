'use client';

import * as React from 'react';

type SearchValue = { query: string; setQuery: (value: string) => void };

const SearchContext = React.createContext<SearchValue | null>(null);

/** 顶栏搜索框与首页列表共享同一个关键词状态 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = React.useState('');
  const value = React.useMemo<SearchValue>(() => ({ query, setQuery }), [query]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

const noop = () => {};

/** 未包裹 Provider 时退化为空关键词，避免组件直接报错 */
export function useSearchQuery(): SearchValue {
  return React.useContext(SearchContext) ?? { query: '', setQuery: noop };
}
