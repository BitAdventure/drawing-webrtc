import classNames from "classnames";
import { useCallback, useMemo, useRef } from "react";
import Button from "@/components/common/UI/button/Button";
import CloseIcon from "@/assets/icons/close-icon.svg?react";
import Toggle from "@/components/common/UI/customToggler/Toggle";
import useMountEffect from "@/hooks/useMountEffect";
import { Controller, FieldValues, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import IncrementTextField from "@/components/common/UI/incrementTextField/IncrementTextField";
import { useSelector } from "@/hooks/useSelector";
import { useActions } from "@/hooks/useActions";
import Categories from "./categories/Categories";
import { MAX_PLAYERS, MAX_ROUNDS } from "@/constants/constants";

import styles from "./style.module.css";

type PropsType = {
  open: boolean;
  hasTransitionedIn: boolean;
  onClose: () => void;
  settingsData: FieldValues;
};

const schema: yup.ObjectSchema<FieldValues> = yup.object({
  totalRounds: yup.number().required().min(1),
  drawTime: yup.number().required().min(1),
});

const Settings: React.FC<PropsType> = ({
  open,
  hasTransitionedIn,
  onClose,
  settingsData,
}) => {
  const loading = useSelector((state) => state.game.updateGameSettingsLoading);
  const { updateGameSettings } = useActions();
  const categories = useSelector((state) => state.game.wordCategories);
  const players = useSelector(
    (state) => state.game.eventInfo?.team.players || []
  );
  // const allWordsCategoryId = useSelector((state) => state.game.allWordsCategoryId);

  const formRef = useRef<HTMLFormElement>(null);

  useMountEffect(() => {
    formRef.current?.focus();
  });

  const disableIsLeadPlayerPlayToggle = useMemo(
    () => players.length > MAX_PLAYERS,
    [players.length]
  );

  const {
    handleSubmit,
    control,
    formState: { isDirty },
  } = useForm<FieldValues>({
    defaultValues: {
      ...settingsData,
      categories: settingsData.categories.length
        ? settingsData.categories
        : categories.map((category) => category.value),
    },
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
    !loading && onClose();
  }, [loading, onClose]);

  const onSubmit = useCallback(
    async (data: FieldValues) => {
      isDirty
        ? updateGameSettings({ data, successfulCallback: onClose })
        : onClose();
    },
    [onClose, updateGameSettings, isDirty]
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
      if (!loading) {
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
      }
    },
    [handleSubmitForm, handleClose, loading]
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
            <h2 className={styles.header}>Settings</h2>
            <button type="button" onClick={onClose} className={styles.closeBtn}>
              <CloseIcon />
            </button>
          </header>
          <div className={styles.formContent}>
            <div className={styles.formContentLeftSide}>
              <h3 className={styles.formContentSideHeader}>Game Settings</h3>
              <div className={styles.fieldsWrap}>
                <Controller
                  control={control}
                  name="totalRounds"
                  render={({ field: { ref, ...field } }) => (
                    <IncrementTextField
                      label={"Rounds"}
                      {...field}
                      maxValue={MAX_ROUNDS}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="drawTime"
                  render={({ field: { ref, ...field } }) => (
                    <IncrementTextField label={"Draw Time (sec)"} {...field} />
                  )}
                />
                <Controller
                  control={control}
                  name="hints"
                  render={({ field: { ref, ...field } }) => (
                    <Toggle id={"hints"} label={"Hints"} {...field} />
                  )}
                />
                <Controller
                  control={control}
                  name="isLeadPlayerPlay"
                  render={({ field: { ref, ...field } }) => (
                    <Toggle
                      id={"isLeadPlayerPlay"}
                      label={"Will The Lead Player Play?"}
                      labels={["Yes", "No"]}
                      {...field}
                      isDisabled={disableIsLeadPlayerPlayToggle}
                    />
                  )}
                />
              </div>
            </div>
            <div className={styles.formContentRightSide}>
              <h3 className={styles.formContentSideHeader}>Categories</h3>
              <Controller
                control={control}
                name="categories"
                render={({
                  field: { ref, ...field },
                  fieldState: { error },
                }) => (
                  <Categories
                    categories={categories}
                    {...field}
                    error={error}
                  />
                )}
              />
            </div>
          </div>
          <div className={styles.footer}>
            <Button btnText="Cancel" onClickHandler={onClose} isReject />
            <Button
              btnText="Save"
              onClickHandler={handleSubmitForm}
              submit
              disabled={loading}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
