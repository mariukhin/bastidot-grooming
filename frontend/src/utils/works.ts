export type WorkFrame = {
  src: string;
  alt: string;
};

export type Work = {
  id: string;
  /** Заголовок картки. Має збігатися з назвою породи в базі. */
  breedName: string;
  /**
   * На картці не показується — за ним підбирається послуга, яку відкриє кнопка
   * «Записатись». Має точно збігатися з service.type у базі, інакше запис
   * відкриється лише з обраною породою, без підставленої послуги.
   */
  serviceType: string;
  /** Короткий додаток на кшталт «+ вирізання ковтунів». */
  note?: string;
  /** Якщо фактична сума відрізнялась від прайсової. */
  priceOverride?: number;
  before: WorkFrame;
  after: WorkFrame;
  /** Рівно одна робота може бути головною — вона показується великою карткою. */
  featured?: boolean;
};

// Фото — у frontend/public/works/, шляхи вказуються від кореня, без «public».
// Кадри будь-які повні знімки, суміщення не потрібне (див. SCRUM-39).
export const WORKS: Work[] = [
  {
    id: 'maltipo-1',
    breedName: 'Мальтіпу',
    serviceType: 'Комплекс Мальтіпу від 3-5 кг',
    before: {
      src: '/works/maltipo-1-before.jpg',
      alt: 'Рудий мальтіпу до стрижки: відросла кучерява шерсть, чубчик закриває очі',
    },
    after: {
      src: '/works/maltipo-1-after.jpg',
      alt: 'Той самий мальтіпу після комплексу: підстрижений корпус, відкрита мордочка',
    },
    featured: true,
  },
  {
    id: 'maltipo-2',
    breedName: 'Мальтіпу',
    serviceType: 'Комплекс Мальтіпу від 3-5 кг',
    before: {
      src: '/works/maltipo-2-before.jpg',
      alt: 'Чорно-підпалий мальтіпу до стрижки: волога відросла шерсть',
    },
    after: {
      src: '/works/maltipo-2-after.jpg',
      alt: 'Той самий мальтіпу після стрижки: акуратно оформлена кругла мордочка',
    },
  },
  {
    id: 'maltipo-3',
    breedName: 'Мальтіпу',
    serviceType: 'Комплекс Мальтіпу від 3-5 кг',
    before: {
      src: '/works/maltipo-3-before.jpg',
      alt: 'Рудий мальтіпу до стрижки стоїть на грумерському столі',
    },
    after: {
      src: '/works/maltipo-3-after.jpg',
      alt: 'Той самий мальтіпу після стрижки: короткий корпус і пухнаста голова',
    },
  },
  {
    id: 'maltipo-4',
    breedName: 'Мальтіпу',
    serviceType: 'Комплекс Мальтіпу від 3-5 кг',
    before: {
      src: '/works/maltipo-4-before.jpg',
      alt: 'Рудий мальтіпу до стрижки сидить, шерсть сильно відросла',
    },
    after: {
      src: '/works/maltipo-4-after.jpg',
      alt: 'Той самий мальтіпу після стрижки: підібраний корпус і рівна кругла голова',
    },
  },
];
