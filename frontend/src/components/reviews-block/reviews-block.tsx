import Image from 'next/image';
import styles from './reviews-block.module.scss';
import groomerPreview from './groomerPreview.png';
import quotePhoto from './quote.png';
import smallQuotePhoto from './quote.svg';

const ReviewsBlock = () => {
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
                  <Image
                    className={styles.smallQuote}
                    src={smallQuotePhoto}
                    alt="small quote photo"
                  />
                  <div className={styles.reviewItemTextContainer}>
                    <p className={styles.reviewItemMainText}>{item.text}</p>
                    <p className={styles.reviewItemAuthorName}>{item.name}</p>
                    <p className={styles.reviewItemPetName}>разом з коргі на ім’я Кенді</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReviewsBlock;
