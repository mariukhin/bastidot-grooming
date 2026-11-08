'use client';

import type { ReactNode } from 'react';

import styles from './staff.module.scss';

/** Тимчасовий вміст вкладки, поки її наповнення — окрема задача. */
const Stub = ({ title, text, children }: { title: string; text: string; children?: ReactNode }) => (
  <section className={styles.stub}>
    <h2 className={styles.stubTitle}>{title}</h2>
    <p className={styles.stubText}>{text}</p>
    {children}
  </section>
);

export default Stub;
