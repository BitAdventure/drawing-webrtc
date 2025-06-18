import { Client, ClientOptions, createClient } from "graphql-ws";
import { Config } from "@/services/config";
import { GRAPHQL_URL } from "@/services/requestURLs";
import TokenService from "@/services/tokenService";
import store from "@/store/store";
import { AppDispatch } from "@/services/setupInterceptors";
import { verifyToken } from "@/store/auth/AuthThunks";

const { dispatch }: { dispatch: AppDispatch } = store;

const wsInstance = (function () {
  let instance: Client;
  function createInstance(options: ClientOptions): Client {
    const client = createClient({
      ...options,
      on: {
        ...options.on,
        opened: (socket: any) => {
          options.on?.opened?.(socket);
        },
      },
      retryAttempts: Infinity,
      shouldRetry: (ev: any) => (ev?.code === 4499 ? false : true),
    });

    return client;
  }

  return {
    getInstance: function () {
      if (!instance) {
        instance = createInstance({
          url: `${Config.API_WEB_SOCKET_URL}${GRAPHQL_URL}`,
          connectionParams: async () => {
            await dispatch(verifyToken());

            const token = TokenService.getLocalAccessToken();

            return {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            };
          },
        });
      }
      return instance;
    },
  };
})();

export default wsInstance;
