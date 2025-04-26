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
    const cache = !(["PUT", "POST"].includes(options.method?.toUpperCase() ?? "")) && !options.body;
    const cacheKey: string = getCacheKey(url);
    let cached: CacheEntry<T> | null = null;
    const headers = new Headers(options.headers);

    if (cache) {
      const stored = localStorage.getItem(cacheKey);

      if (stored) {
        try {
          cached = JSON.parse(stored);
        } catch {}
      }
      if (cached?.etag) headers.set('If-None-Match', cached!.etag);
      if (cached?.lastModified) headers.set('If-Modified-Since', cached!.lastModified);
    }

    const res = await fetch(url, { ...options, headers });

    if (cache && res.status === 304 && cached?.data) {
      return cached!.data;
    }

    // If the response is 204 No Content, return an empty object
    if (res.status === 204) {
      return null as T;
    }

    const data: T = await checkFigshareResponse(res);

    if (cache) {
      const newCache: CacheEntry<T> = {
        etag: res.headers.get('ETag') || undefined,
        lastModified: res.headers.get('Last-Modified') || undefined,
        data,
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(newCache));
      } catch (e) {
        // If the error is a LocalStorage error, clear the cache
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          localStorage.clear();
          localStorage.setItem(cacheKey, JSON.stringify(newCache));
        } else {
          throw e;
        }
      }
    }

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
export async function fetchAllPagesWithConditionalCache<T>(
    url: string,
    options: Partial<RequestInit>,
    onPage: (data: T[]) => void,
    pageSize: number = 100
): Promise<void> {
  try {
    let offset = 0;
    let seenFinalPageHash: string | null = null;
    const urlObj = new URL(url);

    while (true) {
      urlObj.searchParams.set('limit', String(pageSize));
      urlObj.searchParams.set('offset', String(offset));
      const url = urlObj.toString();

      const pageData = await fetchWithConditionalCache<T[]>(url, options);

      // End if nothing returned
      if (!pageData?.length) break;

      // Hash current page contents
      const hash = JSON.stringify(pageData);

      // Detect loop: same page served again
      if (hash === seenFinalPageHash) break;

      onPage(pageData);

      if (pageData.length < pageSize) break;

      // Save hash of last full page
      seenFinalPageHash = hash;
      offset += pageSize;
    }
  } catch (e) {
    throw toFigshareAPIError(e);
  }
}
