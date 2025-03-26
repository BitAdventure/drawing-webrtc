import { Outlet } from "react-router-dom";

import styles from "./style.module.css";

const MainLayout = () => (
  <div className={styles.pageWrapper}>
    <Outlet />
  </div>
);

export default MainLayout;
