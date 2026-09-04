'use client';

import { FC, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import classNames from 'classnames';

import styles from './reviews-block.module.scss';
import { Icon, IconTypes } from '@/components/icon';
import { normalizeReviews, ReviewProps } from '@/utils/function';

const Stars: FC<{ rating: number }> = ({ rating }) => (
  <div className={styles.stars} aria-hidden="true">
    {Array.from({ length: 5 }).map((_, index) => (
      <svg key={index} viewBox="0 0 20 20" width={14} height={14}>
        <path
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5Z"
          fill={index < rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={index < rating ? 0 : 1.2}
        />
      </svg>
    ))}
  </div>
);

const ReviewCard: FC<{ review: ReviewProps }> = ({ review }) => {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const text = textRef.current;
    if (text) {
      setIsClamped(text.scrollHeight > text.clientHeight);
    }
  }, []);

  return (
    <article
      className={styles.reviewItem}
      tabIndex={0}
      aria-label={`Відгук від ${review.name}, оцінка ${review.rating} з 5`}
    >
      <div className={styles.reviewItemTop}>
        <div className={styles.reviewItemAvatarWrap}>
          <Image
            className={styles.reviewItemPhoto}
            width={44}
            height={44}
            src={review.photoSrc}
            alt=""
          />
          <Icon
            className={styles.reviewItemGoogleBadge}
            id={IconTypes.google}
            width={14}
            height={14}
          />
        </div>
        <div>
          <p className={styles.reviewItemAuthorName}>{review.name}</p>
          <p className={styles.reviewItemDate}>{review.date}</p>
        </div>
      </div>

      <Stars rating={review.rating} />

      <p
        ref={textRef}
        className={classNames(
          styles.reviewItemMainText,
          expanded && styles.reviewItemMainTextExpanded
        )}
      >
        {review.text}
      </p>

      {isClamped && !expanded && (
        <button type={'button'} className={styles.reviewItemMore} onClick={() => setExpanded(true)}>
          Читати повністю
        </button>
      )}
    </article>
  );
};

const ReviewsBlock = () => {
  const [reviewsFetch, setReviews] = useState<ReviewProps[]>([]);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/reviews');
        const data = await response.json();

        if (Array.isArray(data)) {
          setReviews(normalizeReviews(data));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchReviews();
  }, []);

  const updateEdges = () => {
    const rail = railRef.current;
    if (!rail) return;

    setAtStart(rail.scrollLeft <= 0);
    setAtEnd(rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1);
  };

  useEffect(() => {
    updateEdges();

    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [reviewsFetch]);

  const scrollByCard = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;

    const card = rail.firstElementChild as HTMLElement | null;
    const amount = card ? card.offsetWidth + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * amount, behavior: 'instant' });
    updateEdges();
  };

  if (reviewsFetch.length === 0) return null;

  return (
    <div className={styles.reviewsContainer} id={'reviews'}>
      <div className={styles.reviewsWrapper}>
        <div className={styles.reviewsTitleWrapper}>
          <p className={styles.reviewsTitle}>Відгуки</p>
          <p className={styles.reviewsSubtitle}>Надихаючі слова наших клієнтів</p>
        </div>

        <div className={styles.reviewsRailWrapper}>
          <div className={styles.reviewsBlock} ref={railRef}>
            {reviewsFetch.map((item) => (
              <ReviewCard key={item.id} review={item} />
            ))}
          </div>

          <div className={styles.railNav}>
            <button
              type={'button'}
              className={styles.railNavButton}
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
              aria-label={'Попередні відгуки'}
            >
              <Icon id={IconTypes.chevronLeft} width={18} height={18} />
            </button>
            <button
              type={'button'}
              className={styles.railNavButton}
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
              aria-label={'Наступні відгуки'}
            >
              <Icon id={IconTypes.chevroneRight} width={18} height={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsBlock;
