import {
  TypedUseSelectorHook,
  useSelector as useNativeSelector,
} from "react-redux";
import store from "@/store/store";

export const useSelector: TypedUseSelectorHook<
  ReturnType<typeof store.getState>
> = useNativeSelector;

export type RootState = ReturnType<typeof store.getState>;
