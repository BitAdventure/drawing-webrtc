import { AuthReducer } from "./auth/AuthSlice";
import { GameReducer } from "./game/GameSlice";

const reducer = {
  auth: AuthReducer,
  game: GameReducer,
};

export default reducer;
