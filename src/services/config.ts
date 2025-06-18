interface IConfig {
  API_BASE_URL: string;
  API_WEB_SOCKET_URL: string;
  API_HASURA_BASE_URL: string;
  UNIVERSAL_LOGIN_URL: string;
  SOCKET_IO_SERVER_URL: string;
}

export const Config: IConfig = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || window._env_.VITE_API_BASE_URL,
  API_WEB_SOCKET_URL: import.meta.env.VITE_API_WEB_SOCKET_URL || window._env_.VITE_API_WEB_SOCKET_URL,
  API_HASURA_BASE_URL: import.meta.env.VITE_API_HASURA_BASE_URL || window._env_.VITE_API_HASURA_BASE_URL,
  UNIVERSAL_LOGIN_URL: import.meta.env.VITE_UNIVERSAL_LOGIN_URL || window._env_.VITE_UNIVERSAL_LOGIN_URL,
  SOCKET_IO_SERVER_URL: import.meta.env.VITE_SOCKET_IO_SERVER_URL || window._env_.VITE_SOCKET_IO_SERVER_URL,
};
