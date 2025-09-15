import { useCallback, useState } from "react";
import { useSelector } from "@/hooks/useSelector";
import { useParams } from "react-router-dom";
import { useActions } from "@/hooks/useActions";
import useMountEffect from "@/hooks/useMountEffect";
import Artwork from "./Artwork";
import ResultsContent from "./ResultsContent";

const Results: React.FC = () => {
  const { id } = useParams();
  const resultLoading = useSelector((store) => store.game.resultLoading);
  const { getResults } = useActions();

  const [isArtWorkSkipped, setIsArtWorkSkipped] = useState(
    !!localStorage.getItem("is_artwork_skipped")
  );

  useMountEffect(() => {
    getResults(id!);
  });

  const handleSkipArtwork = useCallback(() => {
    setIsArtWorkSkipped(true);
    localStorage.setItem("is_artwork_skipped", "true");
  }, []);

  return resultLoading ? null : isArtWorkSkipped ? (
    <ResultsContent />
  ) : (
    <Artwork onSkipArtwork={handleSkipArtwork} />
  );
};

export default Results;
