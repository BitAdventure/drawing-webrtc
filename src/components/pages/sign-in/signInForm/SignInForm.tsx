import { FieldError, FieldValues, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useMemo, useRef } from "react";
import { useActions } from "@/hooks/useActions";
import FormTextField from "@/components/common/UI/formTextField/FormTextField";
import useMountEffect from "@/hooks/useMountEffect";
import { useParams } from "react-router-dom";
import SignInFooter from "@/components/common/UI/commonFooter/CommonFooter";
import SignInLogo from "@/components/common/UI/signInLogo/SignInLogo";

import styles from "./style.module.css";

const rawInitialState: FieldValues = {
  name: "",
  code: "",
};

const schema: yup.ObjectSchema<FieldValues> = yup.object({
  name: yup.string().required("Name is required"),
  code: yup.string().required(),
});

const SignInForm = () => {
  const { id } = useParams();
  const query = new URLSearchParams(location.search);
  const eventCode = query.get("code");
  const expectedRole = query.get("role");

  const initialState = useMemo(
    () => ({
      ...rawInitialState,
      eventId: id,
      expectedRole,
      code: eventCode || "",
    }),
    [eventCode, id, expectedRole]
  );

  const formRef = useRef<HTMLFormElement>(null);

  useMountEffect(() => formRef.current?.focus());

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: initialState,
    resolver: yupResolver(schema),
  });
  const { signIn } = useActions();

  const handleSignIn = useCallback(
    async (data: FieldValues) => await signIn(data),
    [signIn]
  );

  const handleSubmitForm = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();
      handleSubmit(handleSignIn)();
    },
    [handleSubmit, handleSignIn]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => e.key === "Enter" && handleSubmitForm(e),
    [handleSubmitForm]
  );

  return (
    <form
      ref={formRef}
      tabIndex={1}
      onKeyDown={handleKeyDown}
      className={styles.formWrap}
    >
      <SignInLogo animated />
      <div className={styles.formContent}>
        <h2 className={styles.formContentHeader}>Enter your name…</h2>
        <FormTextField
          name={"name"}
          placeholder={""}
          label={""}
          register={register}
          error={errors.name as FieldError}
        />
      </div>
      <SignInFooter
        btnText={"Next"}
        onClickHandler={handleSubmitForm}
        animated
      />
    </form>
  );
};

export default SignInForm;
