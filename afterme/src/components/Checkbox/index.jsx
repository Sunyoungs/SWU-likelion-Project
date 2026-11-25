import React from 'react';
import CheckedImg from '../../assets/images/checkbox.svg';
import BlankImg from '../../assets/images/checkbox_blank.svg';
import styles from './Checkbox.module.css';

const Checkbox = ({ checked, onChange, label }) => (
  <label className={styles.wrapper} onClick={(e) => e.stopPropagation()}>
    <input
      type="checkbox"
      className={styles.input}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
    />
    <img
      src={checked ? CheckedImg : BlankImg}
      alt=""
      width={18}
      height={18}
      className={styles.icon}
    />
  </label>
);

export default Checkbox;