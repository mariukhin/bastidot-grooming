import { Button } from '@/components/button';
import Image from 'next/image';

import styles from './about-block.module.scss';
import aboutPhoto from './about.png';
import { Icon, IconTypes } from '@/components/icon';
import { offers } from '@/utils/const';

const AboutBlock = () => (
  <div className={styles.aboutContainer} id={'about'}>
    <div className={styles.aboutWrapper}>
      <p className={styles.aboutTitleMobile}>Про нас</p>
      <Image className={styles.aboutPhoto} src={aboutPhoto} alt="about photo" />
      <div className={styles.aboutInfoContainer}>
        <p className={styles.aboutTitle}>Про нас</p>
        <p className={styles.aboutSubtitle}>
          Bastidot Grooming – це сучасний грумінг-салон у самому серці міста Києва, де турбота про
          вашого улюбленця поєднується з професіоналізмом і любов’ю до тварин. У нас працюють
          досвідчені грумери, які знають, як зробити процедури комфортними для вашого хвостика.
        </p>
        <p className={styles.aboutSubtitleBold}>Ми пропонуємо:</p>
        <div className={styles.aboutOffersBlock}>
          {offers.map(({ id, text }) => (
            <div className={styles.aboutOfferItem} key={id}>
              <Icon
                id={IconTypes.circleCheck}
                width={20}
                height={20}
                color={'var(--color-dark-burgundy)'}
              />
              <p className={styles.aboutOfferItemText}>{text}</p>
            </div>
          ))}
        </div>
        <p className={styles.aboutSubtitle}>
          Це місце, де ваші улюбленці отримають найкращий догляд та виглядатимуть бездоганно!
        </p>
        <Button className={styles.aboutButton} type={'submit'} text={'Записатися'} />
      </div>
    </div>
  </div>
);

export default AboutBlock;
