import React, { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import ReactSelect, {
  CSSObjectWithLabel,
  GroupBase,
  Options,
  SingleValue,
  StylesConfig,
  components,
} from "react-select";
import ChevronIcon from "@/assets/icons/chevron-icon.svg?react";
import {
  FieldError,
  FieldValues,
  Noop,
  UseFormSetValue,
} from "react-hook-form";
import classNames from "classnames";

import styles from "./style.module.css";

type PropsType = {
  name: string;
  label?: string;
  value: string;
  options: SelectItemType[];
  onBlur?: Noop;
  placeholder: string;
  setValue:
    | UseFormSetValue<FieldValues>
    | ((name: string, newValue: string) => void);
  focusForm?: () => void;
  isDisabled?: boolean;
  isSearchable?: boolean;
  error?: FieldError | undefined;
  setIsDirty?: Dispatch<SetStateAction<boolean>>;
  isOptionDisabled?: (
    option: SelectItemType,
    selectValue: Options<SelectItemType>
  ) => boolean;
};

export type SelectItemType = {
  label: string;
  value: string | number;
};

const DropdownIndicator = (props: any) => (
  <components.DropdownIndicator {...props}>
    <ChevronIcon />
  </components.DropdownIndicator>
);

const DefaultControl = (props: any) => <components.Control {...props} />;

const Select: React.FC<PropsType> = React.memo(
  ({
    name,
    label,
    value,
    error,
    options,
    setValue,
    focusForm,
    isSearchable = false,
    placeholder,
    isDisabled = false,
    setIsDirty,
    isOptionDisabled = undefined,
  }) => {
    const componentStyles: StylesConfig<
      SelectItemType,
      boolean,
      GroupBase<SelectItemType>
    > = useMemo(
      () => ({
        control: (base: CSSObjectWithLabel) => ({
          ...base,
          minHeight: 0,
          fontFamily: "Nunito",
          fontSize: "1.125rem",
          height: "100%",
          flexGrow: "1",
          background: "#fff",
          boxShadow: "none",
          zIndex: "20",
          borderRadius: "1rem",
          overflow: "hidden",
          cursor: "pointer",
          border: `.0625rem solid ${
            error ? "var(--primary-red)" : "transparent"
          }`,
          "&:hover": {
            border: `.0625rem solid ${
              error ? "var(--primary-red)" : "transparent"
            }`,
          },
        }),
        valueContainer: (base: CSSObjectWithLabel) => ({
          ...base,
          padding: "0 1rem 0 1.5rem",
        }),
        singleValue: (base: CSSObjectWithLabel) => ({
          ...base,
          color: "#37789E",
        }),
        placeholder: (base: CSSObjectWithLabel) => ({
          ...base,
          color: "hsl(0, 0%, 50%)",
        }),
        menu: (base: CSSObjectWithLabel) => ({
          ...base,
          borderRadius: "1rem",
        }),
        menuPortal: (base: CSSObjectWithLabel) => ({
          ...base,
          zIndex: "1000",
          fontFamily: "Nunito",
          fontSize: "1.125rem",
        }),
        menuList: (base: CSSObjectWithLabel) => ({
          ...base,
          padding: ".5rem 0",
          overflowX: "hidden",
        }),
        option: (base: CSSObjectWithLabel, { isSelected }) => ({
          ...base,
          padding: ".5rem 1.5rem",
          cursor: "pointer",
          background: isSelected ? "#bf733d" : "#fff",
          color: isSelected ? "#fff" : "#37789E",
          borderRadius: ".25rem",
        }),
        indicatorSeparator: () => ({
          display: "none",
        }),
        indicatorsContainer: (base: CSSObjectWithLabel) => ({
          ...base,
          "& > div": {
            padding: "0 1.5rem 0 0",

            "& > svg": {
              width: "1.5rem",
              height: "auto",
            },
          },
        }),
      }),
      [error]
    );

    const handleChange = useCallback(
      (newValue: SingleValue<SelectItemType>) => {
        newValue &&
          setValue(name, newValue.value, {
            shouldValidate: true,
            shouldDirty: true,
          });
        setIsDirty && setIsDirty(true);
        focusForm?.();
      },
      [setValue, name, setIsDirty, focusForm]
    );

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
      e.stopPropagation();
    }, []);

    const selectWrapClass = classNames({
      [styles.selectWrap]: true,
      [styles.errorField]: error,
    });

    const selectClass = classNames({
      [styles.select]: true,
      [styles.isDisabled]: isDisabled,
    });

    const labelClass = classNames({
      [styles.label]: true,
      [styles.isError]: error,
    });

    const selectedOptions = useMemo(
      () => options.filter((option: SelectItemType) => value === option.value),
      [options, value]
    );

    return (
      <div className={selectWrapClass}>
        {!!label && (
          <label htmlFor={name} className={labelClass}>
            {label}
          </label>
        )}
        <div className={selectClass}>
          <ReactSelect
            isDisabled={isDisabled}
            styles={componentStyles}
            className={styles.muiSelect}
            id={name}
            name={name}
            value={selectedOptions}
            options={options}
            menuPortalTarget={document.body}
            menuPosition={"fixed"}
            onChange={handleChange}
            isSearchable={isSearchable}
            placeholder={placeholder}
            components={{ DropdownIndicator, Control: DefaultControl }}
            isMulti={false}
            isOptionDisabled={isOptionDisabled}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    );
  }
);

export default Select;
