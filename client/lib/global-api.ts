// Import the existing API URL creation logic
import { createApiUrl } from "./api";
import { safeReadResponse } from "./response-utils";

// Make API helper available globally
function api(p: string, o: any = {}) {
  const t = localStorage.getItem("token");

  // Use the existing API URL logic to construct the proper URL
  const url = createApiUrl(p);

  console.log("🚀 Global API call:", {
    endpoint: p,
    url: url,
    method: o.method || "GET",
    hasToken: !!t,
    hasBody: !!o.body,
  });

  // Handle body - if it's already a string, use it as-is, otherwise stringify
  let bodyContent;
  if (o.body) {
    if (typeof o.body === "string") {
      bodyContent = o.body;
    } else {
      bodyContent = JSON.stringify(o.body);
    }
  }

  // Add timeout and better error handling
  const controller = new AbortController();
  const timeoutMs = typeof o.timeout === "number" ? o.timeout : 15000;
  const timeoutId = setTimeout(() => {
    try { controller.abort("timeout"); } catch {}
    console.warn(`⏰ API request timeout after ${timeoutMs}ms:`, url);
  }, timeoutMs);

  return fetch(url, {
    method: o.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(o.headers || {}), // Use headers from options first
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: bodyContent,
    signal: controller.signal,
    keepalive: !!o.keepalive,
    credentials: o.credentials || "same-origin",
  })
    .then(async (r) => {
      clearTimeout(timeoutId);

      console.log("✅ Global API response:", {
        url: url,
        status: r.status,
        ok: r.ok,
        statusText: r.statusText,
      });

      const { ok, status, data } = await safeReadResponse(r);

      return {
        ok,
        status,
        success: ok,
        data: data,
        json: data, // Keep for compatibility
      };
    })
    .catch((error: any) => {
      clearTimeout(timeoutId);

      try {
        console.error(`❌ Global API error (${p}): ${error?.name || "Error"}: ${error?.message || String(error)}`);
      } catch {}
      // Detailed context in a separate object for structured logs
      console.debug({ url, endpoint: p, name: error?.name, message: error?.message });

      // Provide more specific error messages
      if (error.name === "AbortError" || error?.message?.includes("aborted")) {
        const timeoutError = new Error(`Request timeout: ${url}`);
        timeoutError.name = "TimeoutError";
        throw timeoutError;
      }

      if (error.message.includes("Failed to fetch")) {
        const networkError = new Error(
          `Network error: Cannot connect to server at ${url}`,
        );
        networkError.name = "NetworkError";
        throw networkError;
      }

      // Re-throw the original error with more context
      const enhancedError = new Error(
        `API request failed: ${error.message} (${url})`,
      );
      enhancedError.name = error.name;
      enhancedError.cause = error;
      throw enhancedError;
    });
}

// Make it globally available
(window as any).api = api;

export { api };
