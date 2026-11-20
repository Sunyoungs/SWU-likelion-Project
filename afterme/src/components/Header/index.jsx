import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';
import Logo from '../../assets/images/Main_logo.svg'; 
import ProfileLogo from '../../assets/images/Main_profileLogo.svg';

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logoWrapper}>
        <NavLink to="/"><img src={Logo} /></NavLink>
      </div>
      
      <div className={styles.profileWrapper}>
        <NavLink to="mypage"><img src={ProfileLogo} style={{ width: '80%' }} /></NavLink>
      </div>
    </header>
  );
};

export default Header;