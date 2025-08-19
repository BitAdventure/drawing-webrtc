import { createAsyncThunk } from "@reduxjs/toolkit";
import { hasuraInstance } from "@/services/api";
import { FieldValues } from "react-hook-form";
import { GRAPHQL_URL } from "@/services/requestURLs";
import TokenService from "@/services/tokenService";
import { SelectItemType } from "@/components/common/UI/select/Select";
import { GameInfoType, PlayerResultType, PlayerType } from "@/constants/types";
import { toast } from "react-toastify";
import { RootState } from "@/hooks/useSelector";
import { EventStatuses } from "@/constants/enums";
import { Config } from "@/services/config";

export const getTimeDifference = createAsyncThunk<
  number,
  void,
  { rejectValue: string }
>("game/get-time-difference", async (_, { rejectWithValue }) => {
  const reqStartTime = new Date().getTime();

  return await fetch(`${Config.SOCKET_IO_SERVER_URL}/time`, {
    method: "POST",
  })
    .then((res) => res.json())
    .then((res) => {
      console.log(
        "SERVER TIME FROM DIRECT FETCH: ",
        new Date(res.time),
        res.time
      );
      console.log(
        "LOCAL TIME FROM DIRECT FETCH: ",
        new Date(),
        new Date().toISOString()
      );
      const reqEndTime = new Date().getTime();

      const actualAvgTime = (reqStartTime + reqEndTime) / 2;

      return actualAvgTime - new Date(res.time).getTime();
    })
    .catch((e) => rejectWithValue(e.message));
});

export const updateAvatar = createAsyncThunk<
  string,
  FieldValues,
  { rejectValue: string }
>(
  "game/update-avatar",
  async (
    { data: { playerId, avatarId }, successfulCallback },
    { rejectWithValue }
  ) => {
    const graphqlQuery = {
      operationName: "MyMutation",
      query: `mutation MyMutation ($playerId: uuid!, $avatarId: Int!) {
        update_players_by_pk(pk_columns: { id: $playerId }, _set: { avatarId: $avatarId }) {
          id
          avatarId
        }
      }`,
      variables: {
        playerId,
        avatarId,
      },
    };

    return await hasuraInstance
      .post(GRAPHQL_URL, graphqlQuery, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => {
        if (res.data.errors) {
          throw new Error("Some Request Error");
        }
        return res.data;
      })
      .then((res) => {
        successfulCallback();
        return res.data.update_players_by_pk.id;
      })
      .catch((e) => rejectWithValue(e.message));
  }
);

export const getWordCategories = createAsyncThunk<
  { allWordsCategoryId: string; categories: Array<SelectItemType> },
  void,
  { rejectValue: string }
>("game/word-categories", async (_, { rejectWithValue }) => {
  const graphqlQuery = {
    operationName: "MyQuery",
    query: `query MyQuery {
        categories (where: { type: { _eq: sketchWars }}) {
          value: id
          label: name
          isAllQuestions
        }
      }`,
    variables: {},
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
      },
    })
    .then((res) => {
      if (res.data.errors) {
        throw new Error("Some Request Error");
      }
      return res.data;
    })
    .then((res) => {
      const categories = [...res.data.categories]
        .sort(
          (
            a: SelectItemType & { isAllQuestions: boolean },
            b: SelectItemType & { isAllQuestions: boolean }
          ) => (a.isAllQuestions ? -1 : b.isAllQuestions ? 1 : 0)
        )
        .map((category) => ({
          ...category,
          label: category.isAllQuestions ? "Select All" : category.label,
        }));

      const allWordsCategoryId = categories[0]?.value;

      return { categories, allWordsCategoryId };
    })
    .catch((e) => rejectWithValue(e.message));
});

export const updateGameSettings = createAsyncThunk<
  string,
  FieldValues,
  { rejectValue: string; state: RootState }
>(
  "game/update-settings",
  async ({ data, successfulCallback }, { rejectWithValue, getState }) => {
    const { id: settingsId, categories, ...restSettingsData } = data;

    const updates = {
      totalRounds: restSettingsData.totalRounds,
      hints: restSettingsData.hints,
      drawTime: restSettingsData.drawTime,
    };

    const currentGameCategories =
      getState().game.eventInfo?.gameInformation.categories || [];
    const allWordsCategoryId = getState().game.allWordsCategoryId;

    let deletedCategories = [];
    let newGameCategories = [];
    if (categories.includes(allWordsCategoryId)) {
      deletedCategories = currentGameCategories.filter(
        (category) => category !== allWordsCategoryId
      );
      newGameCategories = [
        { categoryId: allWordsCategoryId, gameInformationId: settingsId },
      ];
    } else {
      deletedCategories = currentGameCategories.filter(
        (category) => !categories.includes(category)
      );
      newGameCategories =
        allWordsCategoryId && currentGameCategories.includes(allWordsCategoryId)
          ? categories.map((category: string) => ({
              categoryId: category,
              gameInformationId: settingsId,
            }))
          : categories
              .filter(
                (category: string) => !currentGameCategories.includes(category)
              )
              .map((categoryId: any) => ({
                categoryId,
                gameInformationId: settingsId,
              }));
    }

    const graphqlQuery = {
      operationName: "MyMutation",
      query: `mutation MyMutation ($settingsId: uuid!, $updates: gameInformationSketchWars_set_input, $deletedCategories: [uuid!]!, $newGameCategories: [sketchWars_game_categories_insert_input!]!) {
        update_gameInformationSketchWars_by_pk(pk_columns: { id: $settingsId }, _set: $updates) {
          id
        }
        delete_sketchWars_game_categories (where: {_and: [
          { gameInformationId: { _eq: $settingsId }},
          { category: { id: { _in: $deletedCategories }}}
        ]}) {
          returning {
            id
          }
        }
        insert_sketchWars_game_categories (objects: $newGameCategories) {
          returning {
            id
          }
        }
      }`,
      variables: {
        settingsId,
        updates,
        deletedCategories,
        newGameCategories,
      },
    };

    return await hasuraInstance
      .post(GRAPHQL_URL, graphqlQuery, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => {
        if (res.data.errors) {
          throw new Error("Some Request Error");
        }
        return res.data;
      })
      .then((res) => {
        successfulCallback();
        return res.data.update_gameInformationSketchWars_by_pk.id;
      })
      .catch((e) => rejectWithValue(e.message));
  }
);

export const startGame = createAsyncThunk<
  string,
  { settingsData: GameInfoType },
  { state: RootState; rejectValue: string }
>(
  "game/start-game",
  async ({ settingsData }, { getState, rejectWithValue }) => {
    let query = `update_gameInformationSketchWars_by_pk(pk_columns: { id: $settingsId}, _set: $updates) {
    id
  }`;

    let variables: any = {
      settingsId: settingsData.id,
      updates: { isStarted: true },
    };

    let args = `$settingsId: uuid!, $updates: gameInformationSketchWars_set_input`;

    if (!settingsData.categories.length) {
      query += `\ninsert_sketchWars_game_categories_one (object: $newGameCategory) {
      id
    }`;

      variables = {
        ...variables,
        newGameCategory: {
          gameInformationId: settingsData.id,
          categoryId: getState().game.allWordsCategoryId,
        },
      };

      args += ", $newGameCategory: sketchWars_game_categories_insert_input!";
    }

    const graphqlQuery = {
      operationName: "MyMutation",
      query: `mutation MyMutation (${args}) {
      ${query}
    }`,
      variables,
    };

    return await hasuraInstance
      .post(GRAPHQL_URL, graphqlQuery, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => {
        if (res.data.errors) {
          throw new Error("Some Request Error");
        }
        return res.data;
      })
      .then((res) => {
        return res.data.update_gameInformationSketchWars_by_pk.id;
      })
      .catch((e) => rejectWithValue(e.message));
  }
);

export const getResults = createAsyncThunk<
  Array<PlayerResultType>,
  string,
  { rejectValue: string }
>("game/results", async (eventId, { rejectWithValue }) => {
  const graphqlQuery = {
    operationName: "MyQuery",
    query: `query MyQuery ($eventId: uuid!) {
      eventInfo: events_by_pk (id: $eventId) {
        id
        status
        teams {
          players (order_by: { result: desc_nulls_last }) {
            id
            name
            index
            avatarId
            result
          }
        }
      }
    }`,
    variables: {
      eventId,
    },
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
      },
    })
    .then((res) => {
      if (res.data.errors) {
        throw new Error("Some Request Error");
      }
      return res.data;
    })
    .then(
      (res) =>
        (res.data.eventInfo?.teams?.[0]?.players as Array<PlayerType>).map(
          (player, index) => ({
            ...player,
            rank: index,
          })
        ) || []
    )
    .catch((e) => rejectWithValue(e.message));
});

export const getCurrentPlayerReview = createAsyncThunk<
  boolean,
  string,
  { rejectValue: string }
>("game/current-player-review", async (playerId, { rejectWithValue }) => {
  const graphqlQuery = {
    operationName: "MyQuery",
    query: `query MyQuery ($playerId: uuid!) {
        reviews (where: { playerId: { _eq: $playerId }}) {
          id
        }
      }`,
    variables: {
      playerId,
    },
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
      },
    })
    .then((res) => {
      if (res.data.errors) {
        throw new Error("Some Request Error");
      }
      return res.data;
    })
    .then((res) => !!res.data.reviews[0])
    .catch((e) => rejectWithValue(e.message));
});

export const sendReview = createAsyncThunk<
  FieldValues,
  FieldValues,
  { rejectValue: string }
>(
  "game/send-review",
  async ({ data, successfulCallback }, { rejectWithValue }) => {
    const graphqlQuery = {
      operationName: "MyMutation",
      query: `mutation MyMutation ($reviewData: reviews_insert_input!) {
        insert_reviews_one (object: $reviewData) {
          id
        }
      }`,
      variables: {
        reviewData: data,
      },
    };

    return await hasuraInstance
      .post(GRAPHQL_URL, graphqlQuery, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => {
        if (res.data.errors) {
          throw new Error("Some Request Error");
        }
        return res.data;
      })
      .then((res) => {
        successfulCallback();
        return res.data;
      })
      .catch((e) => {
        toast.error("Some error. Try again");
        return rejectWithValue(e.message);
      });
  }
);

const getRandomResult = () => Math.round(Math.random() * 1000);

export const generateResults = createAsyncThunk<
  FieldValues,
  { players: Array<PlayerType>; eventId: string },
  { rejectValue: string }
>(
  "game/generate-results",
  async ({ players, eventId }, { rejectWithValue }) => {
    const updates = players.map((player) => ({
      where: {
        id: { _eq: player.id },
      },
      _set: { result: getRandomResult() },
    }));

    const graphqlQuery = {
      operationName: "MyMutation",
      query: `mutation MyMutation ($updates: [players_updates!]!, $eventId: uuid!) {
        update_players_many (updates: $updates) {
          returning {
            result
          }
        }
        update_events_by_pk(pk_columns: { id: $eventId}, _set: { status: ${EventStatuses.COMPLETED} }) {
          id
        }
      }`,
      variables: {
        updates,
        eventId,
      },
    };

    return await hasuraInstance
      .post(GRAPHQL_URL, graphqlQuery, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
        },
      })
      .then((res) => {
        if (res.data.errors) {
          throw new Error("Some Request Error");
        }
        return res.data;
      })
      .then((res) => res.data)
      .catch((e) => {
        toast.error("Some error. Try again");
        return rejectWithValue(e.message);
      });
  }
);

export const updateEvent = createAsyncThunk<
  string,
  FieldValues,
  { rejectValue: string }
>("game/update-event", async ({ eventId, updates }, { rejectWithValue }) => {
  const graphqlQuery = {
    operationName: "MyMutation",
    query: `mutation MyMutation ($eventId: uuid!, $updates: events_set_input) {
        update_events_by_pk(pk_columns: { id: $eventId}, _set: $updates) {
          id
        }
      }`,
    variables: {
      eventId,
      updates,
    },
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TokenService.getLocalAccessToken()}`,
      },
    })
    .then((res) => {
      if (res.data.errors) {
        throw new Error("Some Request Error");
      }
      return res.data;
    })
    .then((res) => {
      return res.data.update_events_by_pk.id;
    })
    .catch((e) => rejectWithValue(e.message));
});
