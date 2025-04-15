import { FieldError, FieldValues, UseFormRegister } from "react-hook-form";
import classNames from "classnames";
import { useCallback, useMemo } from "react";

import styles from "./style.module.css";

type PropsType = {
  name: string;
  placeholder: string;
  label: string;
  register: UseFormRegister<FieldValues>;
  error: FieldError;
  disabled?: boolean;
  type?: string;
  useTextarea?: boolean;
};

const FormTextField: React.FC<PropsType> = ({
  register,
  name,
  placeholder,
  label,
  error,
  disabled = false,
  type = "text",
  useTextarea = false,
}) => {
  const labelClassName = classNames({
    [styles.label]: true,
    [styles.isError]: error,
  });

  const inputClassName = classNames({
    [styles.inputWrap]: true,
    [styles.isError]: error,
    [styles.isDisabled]: disabled,
  });

  const Input = useMemo(
    () => (useTextarea ? "textarea" : "input"),
    [useTextarea]
  );

  // stop to submit form on enter click inside textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      useTextarea && e.stopPropagation();
    },
    [useTextarea]
  );

  return (
    <div className={styles.formTextField}>
      {!!label && (
        <label htmlFor={name} className={labelClassName}>
          {label}
        </label>
      )}
      <div className={inputClassName}>
        <Input
          rows={7}
          onKeyDown={handleKeyDown}
          type={type}
          id={name}
          placeholder={placeholder}
          {...register(name)}
          readOnly={disabled}
        />
      </div>
    </div>
  );
};

export default FormTextField;
