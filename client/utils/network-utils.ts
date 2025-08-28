// Network utility functions for handling fetch errors and connectivity issues

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

export async function safeFetch(
  url: string,
  options: FetchOptions = {},
): Promise<Response> {
  const {
    timeout = 5000,
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache",
        Accept: "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Handle different types of errors
    if (error.name === "AbortError") {
      throw new NetworkError(
        `Request timeout after ${timeout}ms`,
        "TIMEOUT",
        true,
      );
    }

    if (
      error.message?.includes("Failed to fetch") ||
      error.name === "TypeError"
    ) {
      throw new NetworkError(
        "Network connectivity issue",
        "CONNECTIVITY",
        true,
      );
    }

    // For other errors, check if retry is possible
    if (retries > 0) {
      console.log(
        `🔄 Retrying fetch in ${retryDelay}ms (${retries} retries left)`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      return safeFetch(url, { ...options, retries: retries - 1 });
    }

    throw new NetworkError(
      error.message || "Unknown network error",
      "UNKNOWN",
      false,
    );
  }
}

export async function fetchWithFallback<T>(
  url: string,
  fallbackData: T,
  options: FetchOptions = {},
): Promise<{ data: T; isFromCache: boolean }> {
  try {
    const response = await safeFetch(url, { retries: 1, ...options });

    if (response.ok) {
      const data = await response.json();
      return { data, isFromCache: false };
    } else {
      console.warn(`❌ API returned ${response.status} for ${url}`);
      return { data: fallbackData, isFromCache: true };
    }
  } catch (error) {
    if (error instanceof NetworkError) {
      console.warn(`🌐 ${error.message} for ${url}, using fallback`);
    } else {
      console.error(`❌ Unexpected error fetching ${url}:`, error);
    }
    return { data: fallbackData, isFromCache: true };
  }
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function addNetworkStatusListeners(
  onOnline: () => void,
  onOffline: () => void,
): () => void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
