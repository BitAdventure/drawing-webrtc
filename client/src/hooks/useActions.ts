import { useDispatch } from "react-redux";
import { bindActionCreators } from "redux";
import actions from "@/store/actions";

export const useActions = () => {
  const dispatch = useDispatch();
  return bindActionCreators(actions, dispatch);
};
