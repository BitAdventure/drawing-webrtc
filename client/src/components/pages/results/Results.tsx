import { useCallback, useMemo, useState } from "react";
import CommonFooter from "@/components/common/UI/commonFooter/CommonFooter";
import { useSelector } from "@/hooks/useSelector";
import { useParams } from "react-router-dom";
import { useActions } from "@/hooks/useActions";
import Podium from "./podium/Podium";
import NonPodium from "./nonPodium/NonPodium";
import useMountEffect from "@/hooks/useMountEffect";
import useMountTransition from "@/hooks/useMountTransition";
import { createPortal } from "react-dom";
import Review from "@/components/popups/review/Review";
import { useAuth } from "@/hooks/useAuth";

import styles from "./style.module.css";

const Results: React.FC = () => {
  const { id } = useParams();
  const [isOpenReview, setIsOpenReview] = useState(false);
  const hasReviewTransitionedIn = useMountTransition(isOpenReview, 300);
  const resultLoading = useSelector((store) => store.game.resultLoading);
  const playersResult = useSelector((store) => store.game.resultPlacement);
  const currentPlayerReviewLoading = useSelector(
    (store) => store.game.currentPlayerReviewLoading
  );
  const isUserAlreadySendReview = useSelector(
    (store) => store.game.isUserAlreadySendReview
  );
  const { getResults, getCurrentPlayerReview } = useActions();
  const { currentUser } = useAuth();

  const winners = useMemo(() => playersResult.slice(0, 3), [playersResult]);
  const loosers = useMemo(() => playersResult.slice(3, 8), [playersResult]);

  useMountEffect(() => {
    getResults(id!);
  });

  useMountEffect(() => {
    const playerId = currentUser?.metadata.playerId;
    playerId && currentPlayerReviewLoading && getCurrentPlayerReview(playerId);
  });

  const handleOpenReview = useCallback(
    () => setIsOpenReview((prev) => !prev),
    []
  );
  const handleCloseReview = useCallback(() => setIsOpenReview(false), []);

  return resultLoading ? null : (
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

export default Results;
