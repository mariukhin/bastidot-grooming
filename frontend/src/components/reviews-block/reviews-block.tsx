'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './reviews-block.module.scss';
import quotePhoto from './quote.png';
import smallQuotePhoto from './quote.svg';
import { Icon, IconTypes } from '@/components/icon';
import { normalizeReviews, ReviewProps } from '@/utils/function';

const ReviewsBlock = () => {
  const [reviewsFetch, setReviews] = useState<ReviewProps[]>([]);

  const API_KEY = 'AIzaSyBKILGzAiZ99aibLBE3zt0-NfF_DxJDTO4';
  const PLACE_ID = 'ChIJb2bAn_v3kIcRBx8SZzY06J0';

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(
          `https://corsproxy.io/?https://maps.googleapis.com/maps/api/place/details/json?fields=reviews&place_id=${PLACE_ID}&key=${API_KEY}`
        );

        const data = await response.json();

        if (data.result && data.result.reviews) {
          setReviews(normalizeReviews(data.result.reviews));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchReviews();
  }, []);

  return (
    <div className={styles.reviewsContainer} id={'reviews'}>
      <div className={styles.reviewsWrapper}>
        <div className={styles.reviewsTitleWrapper}>
          <p className={styles.reviewsTitle}>Відгуки</p>
          <p className={styles.reviewsSubtitle}>Надихаючі слова наших клієнтів</p>
          <Image className={styles.reviewQuotePhoto} src={quotePhoto} alt="quote photo" />
        </div>
        <div className={styles.reviewsBlock}>
          {reviewsFetch.map((item) => (
            <div className={styles.reviewItem} key={item.id}>
              <div className={styles.reviewItemWrapper}>
                <div className={styles.reviewsItemUserBlock}>
                  <Image
                    className={styles.reviewItemPhoto}
                    width={60}
                    height={60}
                    src={item.photoSrc}
                    alt="review user photo"
                  />
                  <Icon id={IconTypes.google} />
                </div>
                <div className={styles.reviewItemTextBlock}>
                  <Image
                    className={styles.smallQuote}
                    src={smallQuotePhoto}
                    alt="small quote photo"
                  />
                  <div className={styles.reviewItemTextContainer}>
                    <p className={styles.reviewItemMainText}>{item.text}</p>
                    <p className={styles.reviewItemAuthorName}>{item.name}</p>
                    {/*<p className={styles.reviewItemPetName}>разом з коргі на ім’я Кенді</p>*/}
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
