import Image from 'next/image';
import styles from './page.module.scss';
import { Button } from '@/components/button';
import bastiPhoto from './basti.png';
import smallQuotePhoto from './quote.svg';
import quotePhoto from './quote.png';
import { ServicesBlock } from '@/components/services-block';
import { PublicationsBlock } from '@/components/publications-block';
import { TeamBlock } from '@/components/team-block';
import { Icon, IconTypes } from '@/components/icon';
import { CoursesBlock } from '@/components/courses-block';
import coursePreview from '@/components/courses-block/vipGroomerPreview.png';
import classnames from 'classnames';
import dayjs from 'dayjs';
import groomerPreview from '@/components/team-block/groomerPreview.png';

const Dashboard = () => {
  const reviews = [
    {
      id: 1,
      name: 'Коля Напуклий',
      text: 'To quickly start my startup landing page design, I was looking for a landing page UI Kit. Landify is one of the best landing page UI kit I have come across. It’s so flexible, well organised and easily editable.',
      photoSrc: groomerPreview,
    },
    {
      id: 2,
      name: 'Коля Напуклий',
      text: 'I used landify and created a landing page for my startup within a week. The Landify UI Kit is simple and highly intuitive, so anyone can use it.',
      photoSrc: groomerPreview,
    },
    {
      id: 3,
      name: 'Коля Напуклий',
      text: 'Landify saved our time in designing my company page.',
      photoSrc: groomerPreview,
    },
  ];
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.descriptionBlock}>
          <p className={styles.title}>
            Привіт, Я - Басті. <tr />
            Мій салон відкритий до ваших послуг
          </p>
          <p className={styles.subtitle}>
            Ваші особливості, причини обрати вас або опис салону, цінностей і тд
          </p>
          <div className={styles.buttonBlock}>
            <Button type={'submit'} text={'Записатися'} />
            <Button
              type={'submit'}
              text={'Перейти до курсу'}
              variant={'secondary'}
              icon={IconTypes.arrowDown}
            />
          </div>
        </div>
        <div className={styles.photoBlock}>
          <Image className={styles.photo} src={bastiPhoto} alt="basti photo" />
        </div>
      </div>
      <ServicesBlock />
      <PublicationsBlock />
      <TeamBlock />
      <CoursesBlock />
      <div className={styles.reviewsContainer}>
        <div className={styles.reviewsWrapper}>
          <div className={styles.reviewsTitleWrapper}>
            <p className={styles.reviewsTitle}>Відгуки</p>
            <p className={styles.reviewsSubtitle}>Надихаючі слова наших клієнтів</p>
            <Image className={styles.reviewQuotePhoto} src={quotePhoto} alt="quote photo" />
          </div>
          <div className={styles.reviewsBlock}>
            {reviews.map((item) => (
              <div className={styles.reviewItem} key={item.id}>
                <div className={styles.reviewItemWrapper}>
                  <Image
                    className={styles.reviewItemPhoto}
                    src={item.photoSrc}
                    alt="review user photo"
                  />
                  <div className={styles.reviewItemTextBlock}>
                    <Image className={styles.smallQuote} src={smallQuotePhoto} alt="small quote photo" />
                  </div>
                  {/*<p className={styles.teamMemberName}>{item.name}</p>*/}
                  {/*<div className={styles.teamMemberTitleBlock}>*/}
                  {/*  {item.isVip && <span className={styles.teamMemberVipTag}>VIP</span>}*/}
                  {/*  <p className={styles.teamMemberPosition}>Грумер</p>*/}
                  {/*</div>*/}
                  {/*<div className={styles.teamMemberDateBlock}>*/}
                  {/*  <Icon*/}
                  {/*    id={IconTypes.calendarCheck}*/}
                  {/*    color={'var(--color-gray)'}*/}
                  {/*    width={20}*/}
                  {/*    height={20}*/}
                  {/*  />*/}
                  {/*  <p className={styles.teamMemberDateText}>Найближчий час:</p>*/}
                  {/*  <p className={styles.teamMemberDate}>*/}
                  {/*    {dayjs(item.nearestDate).format('DD MMMM HH:mm')}*/}
                  {/*  </p>*/}
                  {/*</div>*/}
                  {/*<Button className={styles.teamMemberButton} type={'submit'} text={'Записатися'} />*/}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
