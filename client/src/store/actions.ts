import { AuthActions } from "./auth/AuthSlice";
import { GameActions } from "./game/GameSlice";

const actions = {
  ...AuthActions,
  ...GameActions,
};

export default actions;
