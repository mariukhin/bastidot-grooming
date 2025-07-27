import styles from './contacts-block.module.scss';
import { Icon, IconTypes } from '@/components/icon';
import { contactBlockSocials } from '@/utils/const';
import classnames from 'classnames';

const ContactsBlock = () => (
  <div className={styles.contactsContainer} id={'contacts'}>
    <div className={styles.contactsWrapper}>
      <p className={styles.contactsTitle}>Контакти</p>
      <p className={styles.contactsSubtitle}>
        Ще не записав свого улюбленця? Ось як з нами зв’язатися та де знайти
      </p>
      <div className={styles.contactsInfoWrapper}>
        <div className={styles.contactsInfoWrapperCards}>
          <div className={styles.contactsInfoCard}>
            <Icon
              id={IconTypes.phone}
              color={'var(--color-dark-burgundy)'}
              width={24}
              height={24}
            />
            <a className={styles.contactsText} href="tel:+380501739178">
              +380 (50) 173-91-78
            </a>
          </div>
          <div className={styles.contactsInfoCard} style={{ padding: '20px 0' }}>
            <Icon
              id={IconTypes.point}
              color={'var(--color-dark-burgundy)'}
              width={24}
              height={24}
            />
            <a
              className={styles.contactsText}
              href="https://maps.app.goo.gl/bdPe7GPDjYbxTAAM9"
              target="_blank"
              rel="noopener noreferrer"
            >
              Велика Васильківська, 23А, Київ, 02000, Україна
            </a>
          </div>
          <div className={classnames(styles.contactsInfoCard, styles.contactsInfoCardHorizontal)}>
            {contactBlockSocials.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={styles.socialLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon id={item.icon} color={'var(--color-dark-burgundy)'} width={32} height={32} />
              </a>
            ))}
          </div>
        </div>
        <div className={styles.mapBlock}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2541.111677194066!2d30.51513377640294!3d50.439020471589984!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8790f7fb9fc0666f%3A0x9de8343667121f07!2sBastidot%20Grooming!5e0!3m2!1suk!2sua!4v1753641396535!5m2!1suk!2sua"
            width="100%"
            height="100%"
            allowFullScreen={false}
            style={{ border: 0, borderRadius: '20px' }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
);

export default ContactsBlock;
