import { createSlice } from "@reduxjs/toolkit";
import {
  updateAvatar,
  getWordCategories,
  updateGameSettings,
  getResults,
  sendReview,
  getCurrentPlayerReview,
  generateResults,
  updateEvent,
  startGame,
} from "./GameThunks";
import { RoundStatuses } from "@/constants/enums";
import { modifySubscriptionEventInfo } from "@/utils/modifyEventInfo";
import { SelectItemType } from "@/components/common/UI/select/Select";
import {
  EventInfoType,
  LineType,
  PlayerResultType,
  RoundResults,
  RoundType,
} from "@/constants/types";

export type GameInitialStateType = {
  eventInfo: EventInfoType | null;
  currentRound: RoundType | null;
  playerAvatar: string | null;
  playerAvatarLoading: boolean;
  playerAvatarError: boolean;
  eventInfoSubscriptionLoading: boolean;
  roundsLoading: boolean;
  wordCategories: Array<SelectItemType>;
  allWordsCategoryId: string | null;
  wordCategoriesLoading: boolean;
  wordCategoriesError: boolean;
  resultPlacement: Array<PlayerResultType>;
  resultLoading: boolean;
  resultError: boolean;
  isUserAlreadySendReview: boolean;
  sendReviewLoading: boolean;
  sendReviewError: boolean;
  currentPlayerReviewLoading: boolean;
  currentPlayerReviewError: boolean;
  isAllPlayersGuessTheWord: boolean;
  roundResults: RoundResults;
  choiceWordLoading: boolean;
};

export const initialState: GameInitialStateType = {
  eventInfo: null,
  currentRound: null,
  playerAvatar: null,
  playerAvatarLoading: false,
  playerAvatarError: false,
  eventInfoSubscriptionLoading: true,
  roundsLoading: true,
  wordCategories: [],
  allWordsCategoryId: null,
  wordCategoriesLoading: true,
  wordCategoriesError: false,
  resultPlacement: [],
  resultLoading: true,
  resultError: false,
  isUserAlreadySendReview: false,
  sendReviewLoading: false,
  sendReviewError: false,
  currentPlayerReviewLoading: true,
  currentPlayerReviewError: false,
  isAllPlayersGuessTheWord: false,
  roundResults: [],
  choiceWordLoading: false,
};

const GameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    updateStoreEventInfo: (
      state,
      { payload }: { payload: { eventInfo: any; withRoundsUpdate?: boolean } }
    ) => {
      const modifiedEventInfo = modifySubscriptionEventInfo(payload.eventInfo);

      if (payload.withRoundsUpdate) {
        const rounds: Array<RoundType> = payload.eventInfo.teams[0]?.rounds;

        const currRound =
          rounds.find((round) => round.status !== RoundStatuses.COMPLETED) ||
          rounds[rounds.length - 1];

        state.isAllPlayersGuessTheWord = false;

        state.currentRound = currRound;
      } else if (
        state.allWordsCategoryId &&
        modifiedEventInfo.gameInformation.categories.includes(
          state.allWordsCategoryId
        )
      ) {
        modifiedEventInfo.gameInformation.categories = state.wordCategories.map(
          (category) => category.value.toString()
        );
      }

      state.eventInfo = modifiedEventInfo;
      if (state.eventInfoSubscriptionLoading)
        state.eventInfoSubscriptionLoading = false;
    },
    updatePartialCurrentRound: (
      state,
      { payload }: { payload: Partial<RoundType> }
    ) => {
      if (payload.correctAnswers) {
        state.isAllPlayersGuessTheWord =
          !!payload.correctAnswers.length &&
          payload.correctAnswers.length ===
            (state.eventInfo?.team.players.length || 0) - 1;
      }
      if (state.currentRound)
        state.currentRound = {
          ...state.currentRound,
          ...payload,
        };

      if (state.choiceWordLoading) state.choiceWordLoading = false;
    },
    updateCurrentRound: (state, { payload }: { payload: RoundType }) => {
      state.currentRound = payload;
    },
    updateRoundResults: (
      state,
      { payload: { roundResults } }: { payload: { roundResults: RoundResults } }
    ) => {
      state.roundResults = roundResults;

      if (state.currentRound) {
        state.currentRound.status = RoundStatuses.SHOW_RESULT;
      }
    },
    updateLines: (
      state,
      { payload: { lines } }: { payload: { lines: Array<LineType> } }
    ) => {
      if (state.currentRound) {
        state.currentRound.lines = lines;
      }
    },
    updateChoiceWordLoading: (state, { payload }: { payload: boolean }) => {
      state.choiceWordLoading = payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateAvatar.pending, (state) => {
      state.playerAvatarError = false;
      state.playerAvatarLoading = true;
    });
    builder.addCase(updateAvatar.fulfilled, (state, { payload }) => {
      state.playerAvatar = payload;
      state.playerAvatarLoading = false;
    });
    builder.addCase(updateAvatar.rejected, (state) => {
      state.playerAvatarError = true;
      state.playerAvatarLoading = false;
    });
    builder.addCase(getWordCategories.pending, (state) => {
      state.wordCategoriesError = false;
      state.wordCategoriesLoading = true;
    });
    builder.addCase(getWordCategories.fulfilled, (state, { payload }) => {
      state.wordCategories = payload.categories;
      state.allWordsCategoryId = payload.allWordsCategoryId;
      state.wordCategoriesLoading = false;
    });
    builder.addCase(getWordCategories.rejected, (state) => {
      state.wordCategoriesError = true;
      state.wordCategoriesLoading = false;
    });
    builder.addCase(getResults.pending, (state) => {
      state.resultError = false;
      state.resultLoading = true;
    });
    builder.addCase(getResults.fulfilled, (state, { payload }) => {
      state.resultPlacement = payload;
      state.resultLoading = false;
    });
    builder.addCase(getResults.rejected, (state) => {
      state.resultError = true;
      state.resultLoading = false;
    });
    builder.addCase(sendReview.pending, (state) => {
      state.sendReviewError = false;
      state.sendReviewLoading = true;
    });
    builder.addCase(sendReview.fulfilled, (state) => {
      state.isUserAlreadySendReview = true;
      state.sendReviewLoading = false;
    });
    builder.addCase(sendReview.rejected, (state) => {
      state.sendReviewError = true;
      state.sendReviewLoading = false;
    });
    builder.addCase(getCurrentPlayerReview.pending, (state) => {
      state.currentPlayerReviewError = false;
      state.currentPlayerReviewLoading = true;
    });
    builder.addCase(getCurrentPlayerReview.fulfilled, (state, { payload }) => {
      state.isUserAlreadySendReview = payload;
      state.currentPlayerReviewLoading = false;
    });
    builder.addCase(getCurrentPlayerReview.rejected, (state) => {
      state.currentPlayerReviewError = true;
      state.currentPlayerReviewLoading = false;
    });
  },
});

export const GameReducer = GameSlice.reducer;
export const GameActions = {
  ...GameSlice.actions,
  updateAvatar,
  getWordCategories,
  updateGameSettings,
  getResults,
  sendReview,
  getCurrentPlayerReview,
  generateResults,
  updateEvent,
  startGame,
};
