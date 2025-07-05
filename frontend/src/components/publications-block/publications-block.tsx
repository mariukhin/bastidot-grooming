import { Button } from '@/components/button';
import Image from 'next/image';
import previewPhoto from '@/components/publications-block/publicationPreview.jpg';
import { Icon, IconTypes } from '@/components/icon';
import classNames from 'classnames';
import styles from './publications-block.module.scss';

const PublicationsBlock = () => {
  const publications = [
    {
      id: 1,
      title: 'Гігієнічний догляд – Шпіц',
      publishDate: '11.11.2025',
      type: 'Догляд',
      views: 1500,
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed vitae euismod lectus arcu consectetur ultrices. Ut sem lacus lacus imperdiet in orci neque integer. Non sed lacus cras turpis eget nec ultricies. Tempor habitasse donec turpis ultrices. Lectus lectus mi faucibus ipsum sodales commodo diam. Risus egestas placerat convallis viverra a sed dignissim ut at. Egestas diam volutpat scelerisque id commodo eget id nunc eu. Magna convallis amet urna orci dolor. Sit et ac est a volutpat habitant.',
    },
    {
      id: 2,
      title: 'Гігієнічний догляд – Шпіц',
      publishDate: '11.11.2025',
      type: 'Догляд',
      views: 1500,
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed vitae euismod lectus arcu consectetur ultrices. Ut sem lacus lacus imperdiet in orci neque integer. Non sed lacus cras turpis eget nec ultricies. Tempor habitasse donec turpis ultrices. Lectus lectus mi faucibus ipsum sodales commodo diam. Risus egestas placerat convallis viverra a sed dignissim ut at. Egestas diam volutpat scelerisque id commodo eget id nunc eu. Magna convallis amet urna orci dolor. Sit et ac est a volutpat habitant.',
    },
    {
      id: 3,
      title: 'Гігієнічний догляд – Шпіц',
      publishDate: '11.11.2025',
      type: 'Догляд',
      views: 1500,
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed vitae euismod lectus arcu consectetur ultrices. Ut sem lacus lacus imperdiet in orci neque integer. Non sed lacus cras turpis eget nec ultricies. Tempor habitasse donec turpis ultrices. Lectus lectus mi faucibus ipsum sodales commodo diam. Risus egestas placerat convallis viverra a sed dignissim ut at. Egestas diam volutpat scelerisque id commodo eget id nunc eu. Magna convallis amet urna orci dolor. Sit et ac est a volutpat habitant.',
    },
    {
      id: 4,
      title: 'Гігієнічний догляд – Шпіц',
      publishDate: '11.11.2025',
      type: 'Догляд',
      views: 1500,
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed vitae euismod lectus arcu consectetur ultrices. Ut sem lacus lacus imperdiet in orci neque integer. Non sed lacus cras turpis eget nec ultricies. Tempor habitasse donec turpis ultrices. Lectus lectus mi faucibus ipsum sodales commodo diam. Risus egestas placerat convallis viverra a sed dignissim ut at. Egestas diam volutpat scelerisque id commodo eget id nunc eu. Magna convallis amet urna orci dolor. Sit et ac est a volutpat habitant.',
    },
    {
      id: 5,
      title: 'Гігієнічний догляд – Шпіц',
      publishDate: '11.11.2025',
      type: 'Догляд',
      views: 1500,
      description:
        'Lorem ipsum dolor sit amet consectetur. Sed vitae euismod lectus arcu consectetur ultrices. Ut sem lacus lacus imperdiet in orci neque integer. Non sed lacus cras turpis eget nec ultricies. Tempor habitasse donec turpis ultrices. Lectus lectus mi faucibus ipsum sodales commodo diam. Risus egestas placerat convallis viverra a sed dignissim ut at. Egestas diam volutpat scelerisque id commodo eget id nunc eu. Magna convallis amet urna orci dolor. Sit et ac est a volutpat habitant.',
    },
  ];

  return (
    <div className={styles.publicationsContainer}>
      <div className={styles.publicationsWrapper}>
        <p className={styles.title}>Публікації</p>
        <div className={styles.publications}>
          {publications.map((item) => (
            <div className={styles.publicationItem} key={item.id}>
              <Image
                className={styles.previewPhoto}
                src={previewPhoto}
                alt="publication preview photo"
              />
              <div className={styles.publicationTextContainer}>
                <p className={styles.publicationTitle}>{item.title}</p>
                <div className={styles.publicationInfoContainer}>
                  <p className={styles.publicationText}>{item.publishDate}</p>
                  <span className={styles.dot} />
                  <p className={styles.publicationText}>{item.type}</p>
                  <span className={styles.dot} />
                  <div className={styles.publicationViewBlock}>
                    <Icon id={IconTypes.eye} color={'var(--color-gray)'} width={18} height={15} />
                    <p className={styles.publicationText}>{item.views}</p>
                  </div>
                </div>
                <p
                  className={classNames(styles.publicationText, styles.publicationDescriptionText)}
                >
                  {item.description}
                </p>
                <Button type={'submit'} text={'Перейти до публікації'} variant={'secondary'} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublicationsBlock;
