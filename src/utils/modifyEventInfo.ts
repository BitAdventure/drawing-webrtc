import { EventInfoType } from "@/constants/types";
import { Config } from "@/services/config";

export const modifySubscriptionEventInfo = (
  rawEventInfo: any
): EventInfoType => ({
  id: rawEventInfo.id,
  status: rawEventInfo.status,
  team: rawEventInfo.teams[0],
  code: rawEventInfo.codes[0].code,
  gameLink: `${Config.UNIVERSAL_LOGIN_URL}${rawEventInfo.id}/login?role=player&code=${rawEventInfo.codes[0].code}&redirect_to=${window.location.origin}/`,
  gameInformation: {
    ...rawEventInfo.gameInformationSketchWars,
    totalRounds: +rawEventInfo.gameInformationSketchWars.totalRounds,
    categories:
      rawEventInfo.gameInformationSketchWars.categories.map(
        (gameCategory: any) => gameCategory.category.id
      ) || [],
  },
  isStarted: !!rawEventInfo.gameInformationSketchWars.isStarted,
});
