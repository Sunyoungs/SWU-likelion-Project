import styles from './Loading.module.css';
import airplaneImg from '../assets/images/login-airplane.svg';
import helloImg from '../assets/images/loading-hello.svg';

export default function Loading({ label = '불러오는 중입니다' }) {
  return (
    <main className={styles.page} role="status" aria-live="polite">
      <div className={styles.stage}>
        <div className={styles.plane} aria-hidden="true">
          <img src={airplaneImg} alt="" />
        </div>

        <img className={styles.hello} src={helloImg} alt="" width="234" height="149" />
        <span className={styles.srOnly}>{label}</span>
      </div>
    </main>
  );
}