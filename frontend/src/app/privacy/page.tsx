import type { Metadata } from 'next';
import Link from 'next/link';

import {
  BUSINESS,
  BUSINESS_ADDRESS,
  BUSINESS_PHONE_DISPLAY,
  SITE_NAME,
  SITE_URL,
  SOCIAL,
} from '@/utils/site';
import { PRIVACY_CONTROLLER, PRIVACY_PATH, PRIVACY_POLICY_VERSION } from '@/utils/privacy';

import styles from './page.module.scss';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description:
    'Які персональні дані збирає грумінг-салон Bastidot, навіщо, скільки зберігає і як їх видалити.',
  alternates: { canonical: `${SITE_URL}${PRIVACY_PATH}` },
};

const UPDATED_AT = '12 жовтня 2026 року';

const controllerName = PRIVACY_CONTROLLER.legalName || SITE_NAME;

const Privacy = () => (
  <main className={styles.container}>
    <article className={styles.wrapper}>
      <header className={styles.head}>
        <h1 className={styles.title}>Політика конфіденційності</h1>
        <p className={styles.meta}>
          Оновлено {UPDATED_AT} · версія {PRIVACY_POLICY_VERSION}
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Хто обробляє ваші дані</h2>
        <p className={styles.text}>
          Володілець персональних даних — {controllerName}
          {PRIVACY_CONTROLLER.taxId && `, код ${PRIVACY_CONTROLLER.taxId}`}, адреса:{' '}
          {BUSINESS_ADDRESS}.
        </p>
        <p className={styles.text}>
          Звʼязатися щодо ваших даних можна за телефоном{' '}
          <a className={styles.link} href={`tel:${BUSINESS.phone}`}>
            {BUSINESS_PHONE_DISPLAY}
          </a>
          {PRIVACY_CONTROLLER.email && (
            <>
              , поштою{' '}
              <a className={styles.link} href={`mailto:${PRIVACY_CONTROLLER.email}`}>
                {PRIVACY_CONTROLLER.email}
              </a>
            </>
          )}{' '}
          або в{' '}
          <a
            className={styles.link}
            href={SOCIAL.telegram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Які дані ми збираємо</h2>
        <ul className={styles.list}>
          <li>
            <strong>Під час запису:</strong> імʼя, номер телефону, електронна пошта (якщо вкажете),
            кличка улюбленця, порода, і ваш коментар до візиту.
          </li>
          <li>
            <strong>У кабінеті:</strong> картка улюбленця — вага, вік, особливості характеру,
            побажання до стрижки, фото, якщо ви його додасте.
          </li>
          <li>
            <strong>Історія візитів:</strong> дата, послуга, майстер, сума.
          </li>
          <li>
            <strong>Якщо входите через Google:</strong> імʼя, адреса пошти та фото профілю, які
            передає Google.
          </li>
          <li>
            <strong>Технічні дані:</strong> знеособлена статистика відвідування сайту (Google
            Analytics) — сторінки, пристрій, джерело переходу.
          </li>
        </ul>
        <p className={styles.text}>Ми не збираємо платіжних даних: оплата відбувається в салоні.</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Навіщо</h2>
        <ul className={styles.list}>
          <li>записати вас на візит і підтвердити запис;</li>
          <li>нагадати про візит та звʼязатися, якщо щось зміниться;</li>
          <li>
            підготуватися до стрижки: майстер заздалегідь знає породу, вагу й особливості улюбленця;
          </li>
          <li>показувати вам історію візитів і улюбленців у кабінеті;</li>
          <li>запросити вас повернутися, якщо ви давно не були;</li>
          <li>рахувати знеособлену статистику сайту.</li>
        </ul>
        <p className={styles.text}>
          Підстава обробки — ваша згода, яку ви даєте під час запису, та виконання договору про
          надання послуг.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Кому передаємо</h2>
        <p className={styles.text}>
          Ми не продаємо ваші дані й не передаємо їх третім особам для реклами. Дані обробляються
          сервісами, на яких працює сайт: хмарний хостинг і база даних, сервіс надсилання
          повідомлень, Google Analytics, а також Google — якщо ви входите через нього. Кожен із них
          отримує лише те, що потрібно для своєї роботи.
        </p>
        <p className={styles.text}>
          Дані можуть бути передані на вимогу державних органів, коли цього вимагає закон.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Скільки зберігаємо</h2>
        <ul className={styles.list}>
          <li>
            Контакти й історію візитів — доки ви клієнт салону і 3 роки після останнього візиту.
          </li>
          <li>Картки улюбленців — доки ви не приберете їх у кабінеті.</li>
          <li>Коди підтвердження телефону — до однієї години.</li>
          <li>Статистику відвідувань — у строки, визначені Google Analytics.</li>
        </ul>
        <p className={styles.text}>
          Після цього дані видаляються або знеособлюються так, що за ними вас уже не впізнати.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Ваші права</h2>
        <p className={styles.text}>
          Ви можете дізнатися, які ваші дані ми зберігаємо, виправити їх, видалити, обмежити обробку
          або відкликати згоду. Частину можна зробити самостійно: імʼя та пошта редагуються в{' '}
          <Link className={styles.link} href="/account">
            кабінеті
          </Link>
          , картка улюбленця прибирається там само. Для решти — зателефонуйте нам, і ми виконаємо
          запит.
        </p>
        <p className={styles.text}>
          Відкликання згоди не скасовує записів, зроблених до нього, але після нього ми перестанемо
          звʼязуватися з вами й видалимо дані, які більше не потрібні за законом.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Файли cookie</h2>
        <p className={styles.text}>
          Сайт зберігає у вашому браузері дані, потрібні для роботи: вашу сесію, якщо ви увійшли, і
          дрібні налаштування інтерфейсу. Google Analytics використовує власні ідентифікатори для
          знеособленої статистики. Ви можете очистити ці дані засобами браузера — сайт працюватиме,
          але доведеться входити заново.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.subtitle}>Зміни політики</h2>
        <p className={styles.text}>
          Якщо ми змінимо цю політику, оновимо дату й версію вгорі сторінки. Разом із кожним записом
          зберігається версія політики, чинна на момент вашої згоди.
        </p>
      </section>
    </article>
  </main>
);

export default Privacy;
