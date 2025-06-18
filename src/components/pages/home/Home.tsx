import SignInLogo from "@/components/common/UI/signInLogo/SignInLogo";

import styles from "./style.module.css";

const Home: React.FC = () => (
  <div className={styles.contentWrap}>
    <SignInLogo animated />
    <div className={styles.text}>
      If you see the Sketch Wars logo above, the game will work fine on your
      computer
    </div>
  </div>
);

export default Home;
