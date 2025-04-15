import { useCallback, useMemo } from "react";
import { SelectItemType } from "@/components/common/UI/select/Select";
import styles from "./style.module.css";

type PropsType = {
  category: SelectItemType;
  changeSelectedCategories: (value: string, checked: boolean) => void;
  selectedCategories: Array<string | number>;
};

const CategoryCheckbox: React.FC<PropsType> = ({
  category,
  changeSelectedCategories,
  selectedCategories,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      changeSelectedCategories(e.target.id, e.target.checked),
    [changeSelectedCategories]
  );
  const isChecked = useMemo(
    () => selectedCategories.includes(category.value),
    [selectedCategories, category]
  );

  return (
    <li className={styles.categoryWrap}>
      <input
        onChange={handleChange}
        type="checkbox"
        name="role"
        id={category.value.toString()}
        checked={isChecked}
      />
      <label htmlFor={category.value.toString()} className={styles.label}>
        {category.label}
      </label>
    </li>
  );
};

export default CategoryCheckbox;
