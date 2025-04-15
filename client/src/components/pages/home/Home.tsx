import SignInLogo from "@/components/common/UI/signInLogo/SignInLogo";
import styles from "./style.module.css";

const Home: React.FC = () => {
  return (
    <div className={styles.contentWrap}>
      <SignInLogo animated />
      <div className={styles.text}>
        If you see the sketch wars logo, everything is fine
      </div>
    </div>
  );
};

export default Home;
