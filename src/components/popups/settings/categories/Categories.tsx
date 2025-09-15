import { useCallback } from "react";
import { SelectItemType } from "@/components/common/UI/select/Select";
import CategoryCheckbox from "./categoryCheckbox/CategoryCheckbox";
import { useSelector } from "@/hooks/useSelector";
import { FieldError } from "react-hook-form";

import styles from "./style.module.css";

type PropsType = {
  categories: Array<SelectItemType>;
  value: Array<string>;
  onChange: (newValue: Array<string>) => void;
  error: FieldError | undefined;
};

const Categories: React.FC<PropsType> = ({
  categories,
  value: selectedCategories,
  onChange,
}) => {
  const allWordsCategoryId = useSelector(
    (state) => state.game.allWordsCategoryId
  );

  const handleChangeSelectedCategories = useCallback(
    (value: string, checked: boolean) => {
      if (checked) {
        if (
          value === allWordsCategoryId ||
          (value !== allWordsCategoryId &&
            selectedCategories.length === categories.length - 1)
        ) {
          onChange(categories.map((category) => category.value.toString()));
        } else onChange([...selectedCategories, value]);
      } else if (value === allWordsCategoryId) {
        onChange([]);
      } else
        onChange(
          selectedCategories.filter(
            (category: string) =>
              category !== value && category !== allWordsCategoryId
          )
        );
    },
    [selectedCategories, onChange, categories, allWordsCategoryId]
  );

  return (
    <div className={styles.categoriesContainer}>
      <div className={styles.categoriesWrap}>
        <ul>
          {categories.map((category) => (
            <CategoryCheckbox
              key={category.value}
              category={category}
              changeSelectedCategories={handleChangeSelectedCategories}
              selectedCategories={selectedCategories}
            />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Categories;
