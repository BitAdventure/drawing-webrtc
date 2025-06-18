import axios from "axios";
import { getRoundResults } from "./utils.js";
import { Message, Player, RoundResults } from "./types.js";

export const hasuraInstance = axios.create({
  baseURL: process.env.API_HASURA_BASE_URL,
  // baseURL: Config.API_HASURA_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "x-hasura-admin-secret": process.env.HASURA_GRAPHQL_ADMIN_SECRET,
  },
});

const GRAPHQL_URL = "graphql";

export const getEventInfo = async (eventId: string) => {
  const graphqlQuery = {
    operationName: "MyQuery",
    query: `query MyQuery ($eventId: uuid!) {
        event: events_by_pk (id: $eventId) {
          id
          status
          teams {
            id
            name
            players (order_by: { index: asc }) {
              id
              name
              index
              avatarId
              result
            }
          }
          codes {
            code
          }
          gameInformationSketchWars {
            id
            drawTime
            hints
            totalRounds
            categories {
              category {
                id
                categoryWords: questions {
                  word: question {
                    id
                    label: question
                  }
                }
              }
            }
          }
        }
      }`,
    variables: {
      eventId,
    },
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery)
    .then((res) => {
      if (res.data.errors) {
        const errorCode = res.data?.errors?.[0]?.extensions?.code;
        throw new Error(errorCode || "Some Request Error");
      }
      return res.data;
    })
    .then((res) => res.data.event);
  // .catch((e) => rejectWithValue(e.message));
};

export const updateEvent = async ({ eventId, updates }: { eventId: string; updates: any }) => {
  const graphqlQuery = {
    operationName: "MyMutation",
    query: `mutation MyMutation ($eventId: uuid!, $updates: events_set_input) {
      update_events_by_pk(pk_columns: { id: $eventId }, _set: $updates) {
        id
      }
    }
    `,
    variables: {
      eventId,
      updates,
    },
  };

  return await hasuraInstance
    .post(GRAPHQL_URL, graphqlQuery)
    .then((res) => {
      if (res.data.errors) {
        const errorCode = res.data?.errors?.[0]?.extensions?.code;
        throw new Error(errorCode || "Some Request Error");
      }
      return res.data;
    })
    .then((res) => res.data.update_events_by_pk.id);
  // .catch((e) => rejectWithValue(e.message));
};

export const processingRoundResults = async (payload: {
  players: Array<Player>;
  messages: Array<Message>;
  startTime: number;
  word: string;
  drawTime: number;
  drawerId: string;
}) => {
  const roundResults = getRoundResults(payload);

  const playersUpdates: Array<{
    where: any;
    _set: { result: number };
  }> = [];

  const updatedPlayers: RoundResults = roundResults.map((player) => {
    const playerNewData: Player & { roundResult: number } = {
      ...player,
      result: (player.result || 0) + player.roundResult,
    };

    player.roundResult &&
      playersUpdates.push({
        where: {
          id: { _eq: player.id },
        },
        _set: { result: playerNewData.result || 0 },
      });

    return playerNewData;
  });

  const graphqlQuery = {
    operationName: "MyMutation",
    query: `mutation MyMutation ($playersUpdates: [players_updates!]!) {
      update_players_many(updates: $playersUpdates) {
        returning {
          id
        }
      }
    }`,
    variables: {
      playersUpdates,
    },
  };

  await hasuraInstance.post(GRAPHQL_URL, graphqlQuery).then((res) => {
    if (res.data.errors) {
      const errorCode = res.data?.errors?.[0]?.extensions?.code;
      throw new Error(errorCode || "Some Request Error");
    }
    return res.data;
  });

  return updatedPlayers;
};
