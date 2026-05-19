let accessToken: string | null = null;
const listeners = new Set<(token: string | null) => void>();

const notify = () => {
  listeners.forEach((listener) => listener(accessToken));
};

export const tokenService = {
  getAccessToken: () => accessToken,

  setAccessToken: (token: string) => {
    accessToken = token;
    notify();
  },

  clearAccessToken: () => {
    accessToken = null;
    notify();
  },

  subscribe: (listener: (token: string | null) => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
