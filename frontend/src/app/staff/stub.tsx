'use client';

import styles from './staff.module.scss';

/** Тимчасовий вміст вкладки, поки її наповнення — окрема задача. */
const Stub = ({ title, text }: { title: string; text: string }) => (
  <section className={styles.stub}>
    <h2 className={styles.stubTitle}>{title}</h2>
    <p className={styles.stubText}>{text}</p>
  </section>
);

export default Stub;
