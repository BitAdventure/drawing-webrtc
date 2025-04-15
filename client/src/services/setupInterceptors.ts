import instance, { InvalidJWTCodeError, hasuraInstance } from "./api";
import TokenService from "./tokenService";
import { refreshToken, verifyToken } from "@/store/auth/AuthThunks";
import { AxiosResponse, AxiosError, InternalAxiosRequestConfig } from "axios";
import store from "@/store/store";
import {
  REFRESH_TOKEN_URL,
  SIGN_IN_CODE_URL,
  STORAGE_URL,
  VERIFY_TOKEN_URL,
} from "./requestURLs";
import { Store } from "redux";

export type AppDispatch = typeof store.dispatch;

const setup = (store: Store) => {
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => config,
    (error: AxiosError) => Promise.reject(error)
  );

  const { dispatch }: { dispatch: AppDispatch } = store;

  instance.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      const originalConfig = err.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      if (
        originalConfig.url !== SIGN_IN_CODE_URL &&
        originalConfig.url !== REFRESH_TOKEN_URL &&
        err.response
      ) {
        // Access Token was expired
        if (
          ((originalConfig.url !== VERIFY_TOKEN_URL &&
            err.response.status === 401) ||
            (originalConfig?.url === STORAGE_URL &&
              err.response.status === 500)) &&
          !originalConfig?._retry
        ) {
          originalConfig._retry = true;

          await dispatch(verifyToken());
          originalConfig.headers.Authorization = `Bearer ${TokenService.getLocalAccessToken()}`;
          const resp = await instance(originalConfig);
          return Promise.resolve(resp);
        }

        if (
          err.response.status === 401 &&
          originalConfig.url === VERIFY_TOKEN_URL &&
          !originalConfig._retry
        ) {
          originalConfig._retry = true;
          await dispatch(refreshToken());
          originalConfig.headers.Authorization = `Bearer ${TokenService.getLocalAccessToken()}`;
        }
        // return Promise.reject(err);
      }
      return Promise.reject(err);
    }
  );

  hasuraInstance.interceptors.response.use(
    async (res: AxiosResponse) => {
      const originalConfig = res.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      if (
        res.data?.errors?.[0]?.extensions?.code === InvalidJWTCodeError &&
        !originalConfig._retry
      ) {
        //token is expired
        originalConfig._retry = true;

        await dispatch(verifyToken());
        originalConfig.headers.Authorization = `Bearer ${TokenService.getLocalAccessToken()}`;
        const resp = await hasuraInstance(originalConfig);
        return Promise.resolve(resp);
      }

      return Promise.resolve(res);
    },
    async (err: AxiosError) => err
  );
};

export default setup;
