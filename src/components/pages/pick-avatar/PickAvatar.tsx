import { FieldValues, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useMemo, useRef } from "react";
import { useActions } from "@/hooks/useActions";
import useMountEffect from "@/hooks/useMountEffect";
import CommonFooter from "@/components/common/UI/commonFooter/CommonFooter";
import { useAuth } from "@/hooks/useAuth";
import playerIcons from "@/services/player-icons";
import SignInLogo from "@/components/common/UI/signInLogo/SignInLogo";
import { useNavigate, useParams } from "react-router-dom";
import { BREAKOUT_ROOM } from "@/constants/routes";
import AvatarItem from "./avatarItem/AvatarItem";

import styles from "./style.module.css";

const rawInitialState: FieldValues = {
  avatarId: 9,
};

const schema: yup.ObjectSchema<FieldValues> = yup.object({
  playerId: yup.string().required(),
  avatarId: yup.number().required(),
});

const PickAvatar = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const playerId = useMemo(() => currentUser?.metadata.playerId, [currentUser]);

  const initialState = useMemo(
    () => ({
      ...rawInitialState,
      playerId,
    }),
    [playerId]
  );

  const formRef = useRef<HTMLFormElement>(null);

  useMountEffect(() => formRef.current?.focus());

  const { handleSubmit, setValue, watch, getValues } = useForm<FieldValues>({
    defaultValues: initialState,
    resolver: yupResolver(schema),
  });

  const avatarId: number = watch("avatarId", getValues().avatarId);
  const { updateAvatar } = useActions();

  const handlePickAvatar = useCallback(
    async (data: FieldValues) => {
      const successfulCallback = () => {
        navigate(`/${id}/${BREAKOUT_ROOM}`);
      };
      await updateAvatar({ data, successfulCallback });
    },
    [updateAvatar, navigate, id]
  );

  const handleSubmitForm = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      handleSubmit(handlePickAvatar)();
    },
    [handleSubmit, handlePickAvatar]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => e.key === "Enter" && handleSubmitForm(e),
    [handleSubmitForm]
  );

  const handleChangeAvatar = useCallback(
    (id: number) => setValue("avatarId", id),
    [setValue]
  );

  return (
    <form
      ref={formRef}
      tabIndex={1}
      onKeyDown={handleKeyDown}
      className={styles.formWrap}
    >
      <SignInLogo />
      <div className={styles.formContent}>
        <h2
          className={styles.formContentHeader}
        >{`${currentUser?.displayName}, select your avatar…`}</h2>
        <AvatarItem item={playerIcons[avatarId]} isSelected />
        <div className={styles.carouselWrap}>
          {playerIcons.map((item) => (
            <AvatarItem
              key={item.id}
              item={item}
              selectedAvatar={avatarId}
              setSelectedAvatar={handleChangeAvatar}
            />
          ))}
        </div>
      </div>
      <CommonFooter onClickHandler={handleSubmitForm} btnText={"Next"} />
    </form>
  );
};

export default PickAvatar;
