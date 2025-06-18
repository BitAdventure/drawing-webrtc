import { createSlice } from "@reduxjs/toolkit";
import TokenServiceInstance from "@/services/tokenService";
import { getAuth, signIn, refreshToken, verifyToken } from "./AuthThunks";
import { FieldValues } from "react-hook-form";
import { UserRoles } from "@/constants/enums";

export type AuthInitialStateType = {
  isAuth: boolean;
  access_token: string | null;
  refresh_token: string | null;
  eventRole: UserRoles | null;
  currentUser: FieldValues | null;
  loading: boolean;
  appLoading: boolean;
  error: boolean;
};

export const initialState: AuthInitialStateType = {
  isAuth: false,
  access_token: null,
  refresh_token: null,
  eventRole: null,
  currentUser: null,
  loading: false,
  appLoading: true,
  error: false,
};

const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    removeAppLoading: (state) => {
      state.appLoading = false;
    },
    logout: (state) => {
      TokenServiceInstance.removeUser();
      state.isAuth = false;
      state.access_token = null;
      state.refresh_token = null;
      state.eventRole = null;
      state.currentUser = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getAuth.pending, (state) => {
      state.error = false;
      state.appLoading = true;
    });
    builder.addCase(getAuth.fulfilled, (state, { payload }) => {
      state.access_token = TokenServiceInstance.getLocalAccessToken();
      state.refresh_token = TokenServiceInstance.getLocalRefreshToken();
      state.eventRole = payload.eventRole;
      state.currentUser = payload;
      state.isAuth = true;
      state.appLoading = false;
    });
    builder.addCase(getAuth.rejected, (state) => {
      state.error = true;
      state.appLoading = false;
    });
    builder.addCase(signIn.pending, (state) => {
      state.error = false;
      state.loading = true;
    });
    builder.addCase(signIn.fulfilled, (state, { payload }) => {
      TokenServiceInstance.setUser({
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
        event_id: payload.eventId,
      });
      state.eventRole = payload.eventRole;
      state.currentUser = payload.user;
      state.access_token = payload.accessToken;
      state.refresh_token = payload.refreshToken;
      state.isAuth = true;
      state.loading = false;
    });
    builder.addCase(signIn.rejected, (state) => {
      state.error = true;
      state.loading = false;
    });
    builder.addCase(refreshToken.pending, () => {});
    builder.addCase(refreshToken.fulfilled, (state, { payload }) => {
      TokenServiceInstance.setUser({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      state.access_token = payload.access_token;
      state.refresh_token = payload.refresh_token;
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.error = true;
      state.loading = false;
    });
  },
});

export const AuthReducer = AuthSlice.reducer;
export const AuthActions = {
  ...AuthSlice.actions,
  getAuth,
  signIn,
  refreshToken,
  verifyToken,
};
