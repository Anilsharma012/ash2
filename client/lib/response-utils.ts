/**
 * Utility functions for handling fetch responses safely
 */

export interface SafeResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Safely reads a fetch response body and parses JSON
 * Prevents "body stream already read" errors
 */
export const safeReadResponse = async <T = any>(
  response: Response,
): Promise<SafeResponse<T>> => {
  let data: T = {} as T;

  try {
    const responseText = await response.text();
    if (responseText.trim()) {
      data = JSON.parse(responseText);
    }
  } catch (parseError) {
    console.warn("Could not parse response as JSON:", parseError);
    // For DELETE operations and other responses that might not have a body
    data = {} as T;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
};

/**
 * Standard error message generator for API responses
 */
export const getApiErrorMessage = (
  data: any,
  status: number,
  operation: string,
): string => {
  if (data?.error) {
    return data.error;
  }

  return `Failed to ${operation} (${status})`;
};

/**
 * Helper for DELETE operations with confirmation
 */
export const handleDelete = async (
  url: string,
  token: string,
  confirmMessage: string,
  onSuccess: () => void,
  onError: (error: string) => void,
): Promise<void> => {
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const { ok, status, data } = await safeReadResponse(response);

    if (ok) {
      onSuccess();
    } else {
      onError(getApiErrorMessage(data, status, "delete"));
    }
  } catch (error) {
    console.error("Delete operation failed:", error);
    onError("Failed to delete item");
  }
};
