// lib/fetchWithConditionalCache.ts

import {checkFigshareResponse, toFigshareAPIError} from "@/lib/utils";

export type CacheEntry<T> = {
  etag?: string;
  lastModified?: string;
  data: T;
};

const CACHE_PREFIX = 'figshare_cache:';

function getCacheKey(url: string): string {
  return `${CACHE_PREFIX}${url}`;
}

/* Cache a response in localStorage with ETag and Last-Modified headers.
    * If the response is 304 Not Modified, return the cached data.
    * If the response is 200 OK, cache the new data and return it.
    * @param url - The URL to fetch.
    * @param options - The options for the fetch request.
    * @returns The fetched data.
    * @throws FigshareAPIError if the response is not ok.
    *
    * This function is useful for caching responses from the Figshare API
    * and avoiding unnecessary network requests when the data has not changed.
* */
export async function fetchWithConditionalCache<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  try {
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

    await checkFigshareResponse(res);

    const data: T = await res.json();

    const newCache: CacheEntry<T> = {
      etag: res.headers.get('ETag') || undefined,
      lastModified: res.headers.get('Last-Modified') || undefined,
      data,
    };

    localStorage.setItem(cacheKey, JSON.stringify(newCache));

    return data;

  } catch (e) {
    throw toFigshareAPIError(e);
  }
}

/* Fetch all pages of data from a paginated API endpoint with conditional caching.
    * @param baseUrl - The base URL of the API endpoint.
    * @param token - The authentication token for the API.
    * @param pageSize - The number of items per page (default: 100).
    * @param onPage - A callback function to handle each page of data.
    * @param fetchOptions - Additional options for the fetch request.
    * @throws FigshareAPIError if the response is not ok.
    *
    * This function is useful for fetching large datasets from paginated APIs
    * while avoiding unnecessary network requests when the data has not changed.
* */
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
  try {
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
  } catch(e) {
    throw toFigshareAPIError(e);
  }
}
