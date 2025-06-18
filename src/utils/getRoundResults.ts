import { MessageType, PlayerType, RoundResults } from "@/constants/types";

const maxRoundPoints = 1000;
const wrongGuessPenaltyPoints = 50;

export const getCorrectMessage = ({
  messages,
  player,
  word,
}: {
  messages: Array<MessageType>;
  player: PlayerType;
  word: string;
}) =>
  messages.find(
    (message) =>
      message.type === "DEFAULT" &&
      message.text.toLowerCase().trim() === word.toLowerCase().trim() &&
      message.player.id === player.id
  );

export const getRoundResults = ({
  players,
  messages,
  startTime,
  drawTime,
  word,
  drawerId,
}: {
  players: Array<PlayerType>;
  messages: Array<MessageType>;
  startTime: number;
  drawTime: number;
  word: string;
  drawerId: string;
}): RoundResults => {
  const getPlayerResult = (messageTime: string) => {
    return messageTime
      ? Math.ceil(
          ((startTime + drawTime * 1000 - new Date(messageTime).getTime()) /
            1000 /
            drawTime) *
            maxRoundPoints
        )
      : 0;
  };

  let drawerIndex = 0;
  let totalTeamPointsWithoutDrawer = 0;

  const playersWithResults = players.map((player, index) => {
    if (player.id === drawerId) {
      drawerIndex = index;
      return {
        ...player,
        roundResult: 0,
      };
    }

    let isUserAlreadyGuessTheWord = false;

    const roundResult = messages
      .filter(
        (message) =>
          message.player.id === player.id && message.type === "DEFAULT"
      )
      .reduce((sum, curr) => {
        if (
          curr.text.toLowerCase().trim() === word.toLowerCase().trim() &&
          !isUserAlreadyGuessTheWord
        ) {
          isUserAlreadyGuessTheWord = true;
          return sum + getPlayerResult(curr.createdAt);
        }

        return sum - wrongGuessPenaltyPoints;
      }, 0);

    const correctedRoundResult = roundResult < 0 ? 0 : roundResult;

    totalTeamPointsWithoutDrawer += correctedRoundResult;

    return {
      ...player,
      roundResult: correctedRoundResult,
    };
  });

  playersWithResults[drawerIndex].roundResult = Math.ceil(
    totalTeamPointsWithoutDrawer / (players.length - 1)
  );

  return playersWithResults.sort(
    (playerA, playerB) => playerB.roundResult - playerA.roundResult
  );
};
