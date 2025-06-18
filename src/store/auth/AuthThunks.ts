import { createAsyncThunk } from "@reduxjs/toolkit";
import instance from "@/services/api";
import TokenService from "@/services/tokenService";
import { FieldValues } from "react-hook-form";
import { toast } from "react-toastify";
import {
  GET_AUTH_URL,
  REFRESH_TOKEN_URL,
  SIGN_IN_CODE_URL,
  VERIFY_TOKEN_URL,
} from "@/services/requestURLs";

export const getAuth = createAsyncThunk(
  "auth/me",
  async (_, { rejectWithValue }) => {
    return await instance
      .get(GET_AUTH_URL, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => res.data)
      .catch((e) => rejectWithValue(e.message));
  }
);

export const signIn = createAsyncThunk<
  FieldValues,
  FieldValues,
  { rejectValue: string }
>("auth/signin", async (values, { rejectWithValue }) => {
  return await instance
    .post(SIGN_IN_CODE_URL, values, {
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((res) => res.data)
    .then((res) => ({
      ...res.session,
      eventId: values.eventId,
    }))
    .catch((e) => {
      toast.error(e.response?.data?.message || "Some error");
      return rejectWithValue(e.response?.data?.message);
    });
});

export const refreshToken = createAsyncThunk<
  { refresh_token: string; access_token: string },
  void,
  { rejectValue: string }
>("auth/refresh-token", async (_, { rejectWithValue }) => {
  return await instance
    .post(REFRESH_TOKEN_URL, {
      refreshToken: TokenService.getLocalRefreshToken(),
      accessToken: TokenService.getLocalAccessToken(),
    })
    .then((res) => ({
      refresh_token: res.data.refreshToken,
      access_token: res.data.accessToken,
    }))
    .catch((e) => {
      return rejectWithValue(e.message);
    });
});

export const verifyToken = createAsyncThunk(
  "auth/token/verify",
  async (_, { rejectWithValue }) => {
    await instance
      .post(
        VERIFY_TOKEN_URL,
        {},
        {
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
          },
        }
      )
      .then((res) => res.data)
      .catch((e) => rejectWithValue(e.message));
  }
);
