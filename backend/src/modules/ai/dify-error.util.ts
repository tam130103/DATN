export type DifyErrorKind =
  | 'dify_timeout'
  | 'dify_5xx'
  | 'dify_413'
  | 'workflow_mismatch';

export type DifyErrorSnapshot = {
  status: number | null;
  kind: DifyErrorKind;
  reqId: string | null;
  detail: string;
};

const TRANSIENT_DIFY_STATUS_CODES = new Set([
  408, 429, 500, 502, 503, 504,
]);

export const isTransientDifyError = (error: unknown): boolean => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const status = axiosError?.response?.status;
  const dataText =
    typeof axiosError?.response?.data === 'string'
      ? axiosError.response.data
      : axiosError?.response?.data
        ? JSON.stringify(axiosError.response.data)
        : '';
  const haystack = `${axiosError?.message || ''} ${dataText}`.toLowerCase();

  if (
    typeof status === 'number' &&
    TRANSIENT_DIFY_STATUS_CODES.has(status)
  ) {
    return true;
  }

  return (
    haystack.includes('503 unavailable') ||
    haystack.includes('504') ||
    haystack.includes('gateway time-out') ||
    haystack.includes('gateway timeout') ||
    haystack.includes('temporar') ||
    haystack.includes('timed out') ||
    haystack.includes('timeout') ||
    haystack.includes('socket hang up') ||
    haystack.includes('econnreset') ||
    haystack.includes('etimedout')
  );
};

export const summarizeDifyError = (error: unknown): string => {
  const snapshot = extractDifyErrorSnapshot(error);
  return `status=${snapshot.status ?? 'unknown'} kind=${snapshot.kind} req_id=${snapshot.reqId ?? 'n/a'} detail=${snapshot.detail}`;
};

const summarizeErrorPayload = (payload: unknown): string => {
  if (typeof payload === 'string') {
    const compact = payload.replace(/\s+/g, ' ').trim();
    if (!compact) {
      return 'empty';
    }
    if (compact.includes('<title>dify.ai | 504: Gateway time-out</title>')) {
      return 'Cloudflare 504 Gateway time-out from api.dify.ai';
    }
    if (compact.includes('503 UNAVAILABLE')) {
      return compact.slice(0, 240);
    }
    return compact.slice(0, 240);
  }

  if (payload && typeof payload === 'object') {
    return JSON.stringify(payload).slice(0, 240);
  }

  return String(payload ?? 'unknown');
};

export const extractDifyErrorSnapshot = (
  error: unknown,
  fallbackKind: DifyErrorKind = 'workflow_mismatch',
): DifyErrorSnapshot => {
  const axiosError = error as {
    response?: { status?: number; data?: unknown };
    message?: string;
  };
  const status =
    typeof axiosError?.response?.status === 'number'
      ? axiosError.response.status
      : null;
  const rawPayload =
    typeof axiosError?.response?.data === 'undefined'
      ? axiosError?.message
      : axiosError.response.data;
  const rawText =
    typeof rawPayload === 'string'
      ? rawPayload
      : rawPayload && typeof rawPayload === 'object'
        ? JSON.stringify(rawPayload)
        : String(rawPayload ?? '');
  const detail = summarizeErrorPayload(rawPayload);
  const haystack = `${axiosError?.message || ''} ${rawText}`.toLowerCase();
  let kind: DifyErrorKind = fallbackKind;

  if (
    status === 413 ||
    haystack.includes('request too large') ||
    haystack.includes('status code 413')
  ) {
    kind = 'dify_413';
  } else if (
    haystack.includes('timeout') ||
    haystack.includes('timed out') ||
    haystack.includes('gateway time-out') ||
    haystack.includes('gateway timeout') ||
    haystack.includes('etimedout') ||
    haystack.includes('econnreset') ||
    haystack.includes('socket hang up')
  ) {
    kind = 'dify_timeout';
  } else if (
    (typeof status === 'number' && status >= 500) ||
    haystack.includes('503 unavailable') ||
    haystack.includes('temporar')
  ) {
    kind = 'dify_5xx';
  } else if (
    haystack.includes('workflow failed') ||
    haystack.includes('caption output') ||
    haystack.includes('thieu data') ||
    haystack.includes('parseable hashtags')
  ) {
    kind = 'workflow_mismatch';
  }

  return {
    status,
    kind,
    reqId: rawText.match(/req[_-]?id[:=\s]+([a-z0-9-]+)/i)?.[1] || null,
    detail,
  };
};
