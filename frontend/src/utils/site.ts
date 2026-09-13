export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bastidot-grooming.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Bastidot Grooming';

export const SITE_TITLE = 'Грумінг-салон Bastidot';

export const SITE_DESCRIPTION =
  'Грумінг-салон Bastidot у центрі Києва, Велика Васильківська 23А. Стрижка і тримінг, гігієнічний комплекс, догляд за кігтями, вухами та шерстю, вичісування котів. Запис онлайн, щодня 09:00–20:00.';

// Саму картинку віддає файлова конвенція Next: src/app/opengraph-image.jpg
// (+ twitter-image.jpg), alt — із сусідніх .alt.txt.
