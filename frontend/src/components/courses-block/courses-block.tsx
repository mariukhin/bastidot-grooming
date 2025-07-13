import { Button } from '@/components/button';
import Image from 'next/image';
import classnames from 'classnames';

import styles from './courses-block.module.scss';
import coursePreview from './vipGroomerPreview.png';

const CoursesBlock = () => (
  <div className={styles.coursesContainer}>
    <div className={styles.coursesWrapper}>
      <p className={styles.coursesTitle}>Курси</p>
      <p className={styles.coursesSubtitle}>Бажаєш навчитися?</p>
      <div className={styles.coursesBlock}>
        <div className={styles.courseItem}>
          <div className={styles.courseItemWrapper}>
            <Image
              className={styles.coursePreviewPhoto}
              src={coursePreview}
              alt="course preview photo"
            />
            <div className={styles.courseInfoWrapper}>
              <p className={styles.courseTitle}>Курс грумінгу для початківців</p>
              <div className={styles.courseDurationBlock}>
                <p className={styles.courseDurationText}>Тривалість:</p>
                <p className={styles.courseDuration}>2 тижні</p>
              </div>
              <div className={styles.courseButtonBlock}>
                <Button
                  type={'submit'}
                  text={'Дізнатися більше'}
                  variant={'secondary'}
                  color={'blue'}
                  className={styles.button}
                />
                <Button
                  className={styles.button}
                  type={'submit'}
                  text={'Записатися'}
                  color={'blue'}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.courseItem}>
          <div className={styles.courseItemWrapper}>
            <div className={styles.coursePreviewPhotoContainer}>
              <Image
                className={classnames(styles.coursePreviewPhoto, styles.blurredPhoto)}
                src={coursePreview}
                alt="course preview photo"
              />
            </div>
            <div className={styles.courseInfoWrapper}>
              <p className={styles.courseTitle}>Готуємо для Вас новий курс</p>
              <div className={styles.courseDurationBlock}>
                <p className={styles.courseDurationText}>Тривалість:</p>
                <p className={styles.courseDuration}>-</p>
              </div>
              <div className={styles.courseButtonBlock}>
                <Button
                  type={'submit'}
                  text={'Дізнатися більше'}
                  variant={'secondary'}
                  color={'blue'}
                  className={styles.button}
                  disabled
                />
                <Button
                  className={styles.button}
                  type={'submit'}
                  text={'Записатися'}
                  color={'blue'}
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default CoursesBlock;
