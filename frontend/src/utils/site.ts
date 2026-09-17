export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bastidot-grooming.vercel.app'
).replace(/\/$/, '');

export const SITE_NAME = 'Bastidot Grooming';

export const SITE_TITLE = 'Грумінг-салон Bastidot';

export const SITE_DESCRIPTION =
  'Грумінг-салон Bastidot у центрі Києва, Велика Васильківська 23А. Стрижка і тримінг, гігієнічний комплекс, догляд за кігтями, вухами та шерстю, вичісування котів. Запис онлайн, щодня 09:00–20:00.';

export const SOCIAL = {
  facebook: 'https://www.facebook.com/profile.php?id=61573034533317',
  instagram: 'https://www.instagram.com/basti.dot',
  youtube: 'https://www.youtube.com/@BastidotGrooming',
  tiktok: 'https://www.tiktok.com/@bastidot.grooming',
  telegram: 'https://t.me/bastidot',
} as const;

export const BUSINESS = {
  placeId: 'ChIJb2bAn_v3kIcRBx8SZzY06J0',
  phone: '+380501739178',
  streetAddress: 'вулиця Велика Васильківська, 23А',
  addressLocality: 'Київ',
  postalCode: '02000',
  addressCountry: 'UA',
  latitude: 50.4390687,
  longitude: 30.517113,
  opens: '09:00',
  closes: '20:00',
  mapUrl: 'https://maps.google.com/?cid=11378401866813677319',
} as const;
