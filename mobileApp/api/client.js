import {API_BASE_URL} from "../constants/api";

const normalizeUrl = (baseUrl, path) => {
  const safeBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${safeBase}${safePath}`;
};

const ensureBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new Error(
      "API_BASE_URL is missing. Set EXPO_PUBLIC_API_URL in your environment."
    );
  }
};

export const apiRequest = async (path, options = {}) => {
  ensureBaseUrl();
  const url = normalizeUrl(API_BASE_URL, path);
  const {headers, body, ...rest} = options;

  const response = await fetch(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.message || "API request failed";
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const api = {
  get: (path, options = {}) => apiRequest(path, {...options, method: "GET"}),
  post: (path, body, options = {}) =>
    apiRequest(path, {...options, method: "POST", body}),
  put: (path, body, options = {}) =>
    apiRequest(path, {...options, method: "PUT", body}),
  del: (path, options = {}) => apiRequest(path, {...options, method: "DELETE"})
};
