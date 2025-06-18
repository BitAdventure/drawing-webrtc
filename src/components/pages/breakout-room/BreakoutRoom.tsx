import { useCallback, useEffect, useMemo } from "react";
import Button from "@/components/common/UI/button/Button";
import { useSelector } from "@/hooks/useSelector";
import wsInstance from "@/utils/subscriptionInit";
import { useNavigate, useParams } from "react-router-dom";
import { useActions } from "@/hooks/useActions";
import { useAuth } from "@/hooks/useAuth";
import { EventStatuses, UserRoles } from "@/constants/enums";
import Player from "./player/Player";
import SWLogo from "@/assets/sw-logo.webp";
import Footer from "./footer/Footer";
import { DRAW, RESULTS } from "@/constants/routes";
import useMountEffect from "@/hooks/useMountEffect";
import { toast } from "react-toastify";

import styles from "./style.module.css";

const BreakoutRoom: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const eventInfoSubscriptionLoading = useSelector(
    (store) => store.game.eventInfoSubscriptionLoading
  );
  const categoriesLoading = useSelector(
    (store) => store.game.wordCategoriesLoading
  );
  const eventInfo = useSelector((store) => store.game.eventInfo);
  const { updateStoreEventInfo, getWordCategories, startGame } = useActions();
  const wsClient = useMemo(() => wsInstance.getInstance(), []);
  const { eventRole } = useAuth();

  const isLeadPlayer = useMemo(
    () => eventRole === UserRoles.LEAD_PLAYER,
    [eventRole]
  );

  useMountEffect(
    () => {
      const subscribeToEvent = async () => {
        const eventInfoSubscription = wsClient.iterate({
          operationName: "MySubscription",
          query: `subscription MySubscription ($eventId: uuid!) {
          eventInfo: events_by_pk (id: $eventId) {
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
                  name
                }
              }
              isStarted
            }
          }
        }`,
          variables: {
            eventId: id,
          },
        });

        if (eventInfoSubscription) {
          for await (const event of eventInfoSubscription) {
            const eventInfo = (event as any).data.eventInfo;
            if (eventInfo) {
              updateStoreEventInfo({ eventInfo });
            }
          }
        }
      };

      subscribeToEvent();
      getWordCategories();
    },
    () => {
      wsClient.terminate();
    }
  );

  useEffect(() => {
    eventInfo?.isStarted && navigate(`/${id}/${DRAW}`);
    eventInfo?.status === EventStatuses.COMPLETED &&
      navigate(`/${id}/${RESULTS}`);
  }, [eventInfo?.status, eventInfo?.isStarted, id, navigate]);

  const handleStartGame = useCallback(() => {
    if ((eventInfo?.team.players.length || 0) < 2)
      return toast.error("The game requires at least 2 players");
    eventInfo && startGame({ settingsData: eventInfo.gameInformation });
  }, [eventInfo, startGame]);

  return eventInfoSubscriptionLoading ||
    categoriesLoading ||
    !eventInfo ? null : (
    <>
      <div className={styles.headerWrap}>
        <div className={styles.headerContent}>
          <p className={styles.headerText}>
            Share This Link With Your Friends:
          </p>
          <div className={styles.copyLinkWrap}>
            <Button
              btnText="Copy Game Link"
              onClickHandler={() =>
                window.navigator.clipboard.writeText(eventInfo.gameLink)
              }
              isCopyLink
            />
          </div>
        </div>
      </div>
      <div className={styles.contentWrap}>
        {/* {!isLeadPlayer && (
          <div className={styles.waitingText}>{`Waiting for ${
            eventInfo.team.players[0].name || "Lead Player"
          } to start the game...`}</div>
        )} */}

        <div className={styles.logoWrap}>
          <img src={SWLogo} alt="Sketch Wars Logo" />
        </div>
        <ul className={styles.playersList}>
          {eventInfo.team.players.map((player) => (
            <Player key={player.id} player={player} />
          ))}
        </ul>
      </div>
      <Footer
        btnText={"Start Game"}
        leadPlayerName={eventInfo.team.players[0].name || "Lead Player"}
        isLeadPlayer={isLeadPlayer}
        onClickHandler={handleStartGame}
      />
    </>
  );
};

export default BreakoutRoom;
