export class ApiError extends Error {
  public code: string;
  public details?: unknown;
  public status: number;

  constructor(message: string, code = 'API_ERROR', status = 400, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Important: send session cookie
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || data?.message || `HTTP ${response.status}: Yêu cầu thất bại`;
    const errorCode = data?.error?.code || 'HTTP_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status, data?.error?.details);
  }

  return data.data !== undefined ? data.data : data;
}
