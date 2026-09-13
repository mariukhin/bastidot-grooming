// Builds the 1200x630 social preview from the hero poster.
// Next serves these through its opengraph-image / twitter-image file convention.
// Run after replacing hero-poster.jpg: node scripts/generate-og-image.mjs
import sharp from 'sharp';
import { copyFileSync, statSync } from 'node:fs';

const WIDTH = 1200;
const HEIGHT = 630;
const SOURCE = 'public/hero-poster.jpg';
const LOGO = 'public/big-logo.svg';
const OUTPUT = 'src/app/opengraph-image.jpg';
const TWITTER_OUTPUT = 'src/app/twitter-image.jpg';

const TITLE = 'Грумінг-салон у центрі Києва';
const SUBTITLE = 'Стрижка, гігієна та догляд за собаками і котами';

const base = await sharp(SOURCE)
  .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
  .toBuffer();

const scrim = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#130202" stop-opacity="0.45" />
        <stop offset="45%" stop-color="#130202" stop-opacity="0.62" />
        <stop offset="100%" stop-color="#130202" stop-opacity="0.80" />
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)" />
  </svg>`
);

const logoMask = await sharp(LOGO, { density: 300 }).resize({ width: 340 }).toBuffer();
const { width: logoWidth, height: logoHeight } = await sharp(logoMask).metadata();

// Repaint the logo white so it stays readable on the darkened photo.
const logo = await sharp({
  create: { width: logoWidth, height: logoHeight, channels: 4, background: '#ffffff' },
})
  .composite([{ input: logoMask, blend: 'dest-in' }])
  .png()
  .toBuffer();

const caption = Buffer.from(
  `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <style>
      .title { font-family: 'Montserrat','Segoe UI',sans-serif; font-weight: 800; font-size: 54px; fill: #ffffff; }
      .subtitle { font-family: 'Montserrat','Segoe UI',sans-serif; font-weight: 600; font-size: 30px; fill: rgba(255,255,255,0.9); }
    </style>
    <text x="50%" y="${HEIGHT / 2 + 78}" text-anchor="middle" class="title">${TITLE}</text>
    <text x="50%" y="${HEIGHT / 2 + 136}" text-anchor="middle" class="subtitle">${SUBTITLE}</text>
  </svg>`
);

await sharp(base)
  .composite([
    { input: scrim, top: 0, left: 0 },
    {
      input: logo,
      top: Math.round(HEIGHT / 2 - logoHeight - 24),
      left: Math.round((WIDTH - logoWidth) / 2),
    },
    { input: caption, top: 0, left: 0 },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(OUTPUT);

copyFileSync(OUTPUT, TWITTER_OUTPUT);

const { size } = statSync(OUTPUT);
console.log(`${OUTPUT} + ${TWITTER_OUTPUT} — ${WIDTH}x${HEIGHT}, ${Math.round(size / 1024)} KB`);
