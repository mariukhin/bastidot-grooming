'use client';

import Image from 'next/image';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import useBookingStore from '@/store/useBookingStore';
import { useReveal } from '@/hooks/use-reveal';
import { formatDuration } from '@/components/booking-modal/utils';
import type { ResolvedWork } from '@/server/works';

import styles from './works-block.module.scss';

type WorksBlockProps = {
  works: ResolvedWork[];
  allWorksUrl: string;
};

const FEATURED_SIZES = '(max-width: 640px) 100vw, (max-width: 1240px) 50vw, 610px';
const PAIR_SIZES = '(max-width: 640px) calc(100vw - 56px), (max-width: 1240px) 25vw, 200px';

const workDuration = (work: ResolvedWork): string | null => {
  if (!work.service) return null;
  const minutes = (work.service.durationHour ?? 0) * 60 + (work.service.durationMin ?? 0);
  return minutes > 0 ? formatDuration(minutes) : null;
};

const workPrice = (work: ResolvedWork): number | null =>
  work.priceOverride ?? work.service?.defaultPrice ?? null;

const Frames = ({
  work,
  sizes,
  priority,
  compact,
}: {
  work: ResolvedWork;
  sizes: string;
  priority?: boolean;
  compact?: boolean;
}) => (
  <div className={styles.frames}>
    {(['before', 'after'] as const).map((stage) => (
      <div key={stage} className={classNames(styles.frame, stage === 'after' && styles.frameAfter)}>
        <Image
          className={styles.photo}
          src={work[stage].src}
          alt={work[stage].alt}
          fill
          sizes={sizes}
          priority={priority}
        />
        <span className={classNames(styles.tag, compact && styles.tagCompact)}>
          {stage === 'before' ? 'До' : 'Після'}
        </span>
      </div>
    ))}
  </div>
);

const WorksBlock = ({ works, allWorksUrl }: WorksBlockProps) => {
  const openBooking = useBookingStore((state) => state.openBooking);
  const revealRef = useReveal<HTMLElement>();
  const railRef = useReveal<HTMLDivElement>();

  if (works.length === 0) {
    return null;
  }

  const featured = works.find((work) => work.featured) ?? works[0];
  const rest = works.filter((work) => work.id !== featured.id);

  const book = (work: ResolvedWork) =>
    openBooking({
      service: work.service ?? undefined,
      breedName: work.breedName,
    });

  const featuredDuration = workDuration(featured);
  const featuredPrice = workPrice(featured);

  return (
    <section className={styles.container} id="works">
      <div className={styles.wrapper}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>До і після</span>
            <h2 className={styles.title}>Наші роботи</h2>
            <p className={styles.subtitle}>
              Кожен кадр — окремо і повністю. Так видно і роботу грумера, і те, яким улюбленець
              прийшов.
            </p>
          </div>
        </div>

        <article className={classNames(styles.featured, 'reveal')} ref={revealRef}>
          <Frames work={featured} sizes={FEATURED_SIZES} priority />
          <div className={styles.infobar}>
            <h3 className={styles.featuredTitle}>{featured.breedName}</h3>
            <ul className={styles.facts}>
              {featuredDuration && <li>{featuredDuration}</li>}
              {featured.note && <li>{featured.note}</li>}
            </ul>
            <div className={styles.buy}>
              {featuredPrice !== null && <span className={styles.price}>{featuredPrice} грн</span>}
              <Button type="button" text="Записатись" onClick={() => book(featured)} />
            </div>
          </div>
        </article>

        {rest.length > 0 && (
          <div className={classNames(styles.pairs, 'reveal')} ref={railRef}>
            {rest.map((work) => {
              const price = workPrice(work);
              const duration = workDuration(work);
              const sub = work.note ?? duration;

              return (
                <article className={styles.pair} key={work.id}>
                  <Frames work={work} sizes={PAIR_SIZES} compact />
                  <div className={styles.pairBody}>
                    <h3 className={styles.pairTitle}>{work.breedName}</h3>
                    {sub && <p className={styles.pairSub}>{sub}</p>}
                    <div className={styles.pairFoot}>
                      {price !== null && <span className={styles.pairPrice}>{price} грн</span>}
                      <Button
                        className={styles.pairButton}
                        type="button"
                        text="Записатись"
                        variant="secondary"
                        onClick={() => book(work)}
                      />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className={styles.foot}>
          <a
            className={styles.linkAll}
            href={allWorksUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Дивитись усі роботи
            <Icon id={IconTypes.chevroneRight} width={17} height={17} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default WorksBlock;
