class TokenServiceInstance {
  getLocalAccessToken() {
    return localStorage.getItem("access_token");
  }

  getLocalRefreshToken() {
    return localStorage.getItem("refresh_token");
  }

  getEventId() {
    return localStorage.getItem("event_id");
  }

  setEventId(eventId: string) {
    return localStorage.setItem("event_id", eventId);
  }

  updateLocalAccessToken(access_token: string) {
    localStorage.setItem("access_token", access_token);
  }

  getUser() {
    return localStorage.getItem("access_token");
  }

  setUser({
    refresh_token,
    access_token,
    event_id,
  }: {
    refresh_token: string;
    access_token: string;
    event_id?: string;
  }) {
    localStorage.removeItem("is_artwork_skipped");
    localStorage.setItem("refresh_token", refresh_token);
    localStorage.setItem("access_token", access_token);
    event_id && localStorage.setItem("event_id", event_id);
  }

  removeUser() {
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("event_id");
  }
}

const TokenService = new TokenServiceInstance();

export default TokenService;
