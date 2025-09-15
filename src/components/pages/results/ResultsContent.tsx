import CommonFooter from "@/components/common/UI/commonFooter/CommonFooter";
import Review from "@/components/popups/review/Review";
import { useActions } from "@/hooks/useActions";
import { useAuth } from "@/hooks/useAuth";
import useMountEffect from "@/hooks/useMountEffect";
import useMountTransition from "@/hooks/useMountTransition";
import { useSelector } from "@/hooks/useSelector";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Podium from "./podium/Podium";
import NonPodium from "./nonPodium/NonPodium";

import styles from "./style.module.css";

const ResultsContent: React.FC = () => {
  const [isOpenReview, setIsOpenReview] = useState(false);
  const hasReviewTransitionedIn = useMountTransition(isOpenReview, 300);
  const playersResult = useSelector((store) => store.game.resultPlacement);
  const currentPlayerReviewLoading = useSelector(
    (store) => store.game.currentPlayerReviewLoading
  );
  const isUserAlreadySendReview = useSelector(
    (store) => store.game.isUserAlreadySendReview
  );
  const { getCurrentPlayerReview } = useActions();
  const { currentUser } = useAuth();
  const winners = useMemo(() => playersResult.slice(0, 3), [playersResult]);
  const loosers = useMemo(() => playersResult.slice(3, 8), [playersResult]);

  useMountEffect(() => {
    const playerId = currentUser?.metadata.playerId;
    playerId && currentPlayerReviewLoading && getCurrentPlayerReview(playerId);
  });

  const handleOpenReview = useCallback(() => setIsOpenReview(true), []);
  const handleCloseReview = useCallback(() => setIsOpenReview(false), []);

  return (
    <>
      <div className={styles.resultsHeader}>Final Results</div>
      <div className={styles.contentWrap}>
        <div className={styles.placesContentWrap}>
          <Podium winners={winners} />
          {!!loosers.length && <NonPodium players={loosers} />}
        </div>
      </div>
      {!currentPlayerReviewLoading && !isUserAlreadySendReview && (
        <CommonFooter onClickHandler={handleOpenReview} btnText={"Next"} />
      )}
      {(isOpenReview || hasReviewTransitionedIn) &&
        createPortal(
          <Review
            open={isOpenReview}
            hasTransitionedIn={hasReviewTransitionedIn}
            onClose={handleCloseReview}
          />,
          document.body
        )}
    </>
  );
};

export default ResultsContent;
