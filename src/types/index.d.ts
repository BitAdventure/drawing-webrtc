export {};

declare global {
  interface Window {
    example: string;
    _env_: {
      VITE_API_BASE_URL?: string;
      VITE_API_HASURA_BASE_URL?: string;
      VITE_API_WEB_SOCKET_URL?: string;
      VITE_UNIVERSAL_LOGIN_URL?: string;
      VITE_SOCKET_IO_SERVER_URL?: string;
      VITE_TURN_SERVER_IP_ADDRESS?: string;
      VITE_TURN_SERVER_USERNAME?: string;
      VITE_TURN_SERVER_CREDENTIAL?: string;
      VITE_SENTRY_DSN?: string;
    };
  }
}
