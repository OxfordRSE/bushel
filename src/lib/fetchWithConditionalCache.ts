// lib/fetchWithConditionalCache.ts

export type CacheEntry<T> = {
  etag?: string;
  lastModified?: string;
  data: T;
};

const CACHE_PREFIX = 'figshare_cache:';

function getCacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

export async function fetchWithConditionalCache<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const cacheKey = getCacheKey(url);
  const stored = localStorage.getItem(cacheKey);
  let cached: CacheEntry<T> | null = null;

  if (stored) {
    try {
      cached = JSON.parse(stored);
    } catch {}
  }

  const headers = new Headers(options.headers);
  if (cached?.etag) headers.set('If-None-Match', cached!.etag);
  if (cached?.lastModified) headers.set('If-Modified-Since', cached!.lastModified);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 304 && cached?.data) {
    return cached!.data;
  }

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`);
  }

  const data: T = await res.json();

  const newCache: CacheEntry<T> = {
    etag: res.headers.get('ETag') || undefined,
    lastModified: res.headers.get('Last-Modified') || undefined,
    data,
  };

  localStorage.setItem(cacheKey, JSON.stringify(newCache));

  return data;
}

type PagedFetcherOpts<T> = {
  baseUrl: string;
  token: string;
  pageSize?: number;
  onPage: (data: T[]) => void;
} & Partial<RequestInit>;

export async function fetchAllPagesWithConditionalCache<T>({
                                                             baseUrl,
                                                             token,
                                                             pageSize = 100,
                                                             onPage,
                                                             ...fetchOptions
                                                           }: PagedFetcherOpts<T>): Promise<void> {
  let offset = 0;
  let keepGoing = true;

  while (keepGoing) {
    const url = `${baseUrl}?limit=${pageSize}&offset=${offset}`;
    const pageData = await fetchWithConditionalCache<T[]>(url, {
      headers: { Authorization: `token ${token}` },
      ...fetchOptions,
    });

    if (!pageData?.length) break;

    onPage(pageData);

    if (pageData.length < pageSize) keepGoing = false;
    else offset += pageSize;
  }
}
