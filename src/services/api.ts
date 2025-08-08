import axios from "axios";
import { Config } from "./config";

const instance = axios.create({
  baseURL: Config.API_BASE_URL,
  headers: {},
});

export const hasuraInstance = axios.create({
  baseURL: Config.API_HASURA_BASE_URL,
  headers: {},
});

export const InvalidJWTCodeError = "invalid-jwt";

export default instance;
