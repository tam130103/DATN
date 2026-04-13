/**
 * Extracts a user-friendly error message from an API error response.
 * Works with NestJS error shapes: { message: string } or { message: string[] }.
 */
export const getApiMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as any).response?.data;
    if (typeof response?.message === 'string') return response.message;
    if (Array.isArray(response?.message) && response.message.length > 0) return response.message[0];
  }

  if (typeof error === 'object' && error && 'message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }

  return fallback;
};
