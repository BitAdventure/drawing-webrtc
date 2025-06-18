import classNames from "classnames";
import { useCallback, useRef } from "react";
import Button from "@/components/common/UI/button/Button";
import CloseIcon from "@/assets/icons/close-icon.svg?react";
import useMountEffect from "@/hooks/useMountEffect";
import { Controller, FieldError, FieldValues, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useActions } from "@/hooks/useActions";
import RatingField from "./ratingField/RatingField";
import FormTextField from "@/components/common/UI/formTextField/FormTextField";
import { toast } from "react-toastify";
import { useAuth } from "@/hooks/useAuth";
import { useSelector } from "@/hooks/useSelector";
import { useParams } from "react-router-dom";

import styles from "./style.module.css";

type PropsType = {
  open: boolean;
  hasTransitionedIn: boolean;
  onClose: () => void;
};

const initialState: FieldValues = {
  score: 0,
  comment: "",
};

const schema: yup.ObjectSchema<FieldValues> = yup.object({
  score: yup.number().required(),
  comment: yup.string(),
});

const Review: React.FC<PropsType> = ({ open, hasTransitionedIn, onClose }) => {
  const { id } = useParams();
  const sendReviewLoading = useSelector(
    (state) => state.game.sendReviewLoading
  );
  const { sendReview } = useActions();
  const { currentUser } = useAuth();

  const formRef = useRef<HTMLFormElement>(null);

  useMountEffect(() => {
    formRef.current?.focus();
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: initialState,
    resolver: yupResolver(schema),
  });

  const OverlayClass = classNames({
    [styles.overlay]: true,
    [styles.isOpenOverlay]: open,
    [styles.isTransitioned]: hasTransitionedIn,
  });

  const ModalClass = classNames({
    [styles.modal]: true,
    [styles.isOpenModal]: open,
    [styles.isTransitioned]: hasTransitionedIn,
  });

  const handleClose = useCallback(() => {
    !sendReviewLoading && onClose();
  }, [sendReviewLoading, onClose]);

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      if (!values.score)
        return toast.error("Please input your rating and/or comments.");

      const playerId: string = currentUser?.metadata.playerId;

      const successfulCallback = () => {
        onClose();
        setTimeout(
          () => (window.location.href = "https://www.runaway.games"),
          1000
        );
      };

      const data = {
        playerId,
        eventId: id,
        ...values,
      };
      await sendReview({ data, successfulCallback });
    },
    [onClose, sendReview, id, currentUser]
  );

  const handleSubmitForm = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      handleSubmit(onSubmit)();
    },
    [handleSubmit, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Enter":
          handleSubmitForm(e);
          break;
        case "Escape":
          handleClose();
          break;
        default:
          break;
      }
    },
    [handleSubmitForm, handleClose]
  );

  const handleStopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    []
  );

  return (
    <div className={OverlayClass} onClick={handleClose}>
      <div className={ModalClass}>
        <form
          ref={formRef}
          tabIndex={1}
          onClick={handleStopPropagation}
          onKeyDown={handleKeyDown}
          className={styles.formWrap}
        >
          <header className={styles.headerWrap}>
            <h2 className={styles.header}>Make Sketch Wars Better!</h2>
            <button
              type="button"
              onClick={handleClose}
              className={styles.closeBtn}
            >
              <CloseIcon />
            </button>
          </header>
          <div className={styles.formContent}>
            <Controller
              name={"score"}
              control={control}
              render={({ field, fieldState: { error } }) => (
                <RatingField
                  label={"Rate Your Experience:"}
                  {...field}
                  error={error}
                />
              )}
            />
            <FormTextField
              name="comment"
              placeholder={`What did you like, dislike, or think we could improve on?`}
              label="Comments:"
              register={register}
              error={errors.comment as FieldError}
              useTextarea
            />
          </div>
          <div className={styles.footer}>
            <Button btnText="Cancel" onClickHandler={handleClose} isReject />
            <Button
              btnText="Submit"
              onClickHandler={handleSubmitForm}
              submit
              disabled={sendReviewLoading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Review;
