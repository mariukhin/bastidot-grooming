#!/usr/bin/env bash
# Кодує героєве відео для головної: десктоп, мобільний і постер.
#
#   npm run hero:encode -- "assets/25 Pet groomer_ (6).mov"
#   npm run hero:encode -- source.mov --poster-at 2.5
#
# Результат лягає в frontend/public/: hero.mp4, hero-mobile.mp4, hero-poster.jpg.
set -euo pipefail

SRC=${1:-}
POSTER_AT=0

shift || true
while [ $# -gt 0 ]; do
  case "$1" in
    --poster-at) POSTER_AT=${2:-0}; shift 2 ;;
    *) echo "Невідомий аргумент: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "Вкажіть вихідний файл: npm run hero:encode -- <шлях до .mov>" >&2
  exit 2
fi

for bin in ffmpeg ffprobe; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Немає $bin у PATH (winget install Gyan.FFmpeg)" >&2; exit 1; }
done

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/frontend/public"

DESKTOP="$OUT/hero.mp4"
MOBILE="$OUT/hero-mobile.mp4"
POSTER="$OUT/hero-poster.jpg"

# -an        звук героєві не потрібен, а він тягне кілобайти й блокує autoplay
# fps=25     вихідні 50 fps для фонового відео надлишкові
# +faststart moov-атом на початок, інакше браузер чекає повного завантаження
# yuv420p    єдиний формат, який грають усі браузери й iOS
encode() {
  local out=$1 scale=$2 crf=$3
  ffmpeg -y -loglevel error -stats -i "$SRC" \
    -an \
    -vf "scale=${scale}:flags=lanczos,fps=25,format=yuv420p" \
    -c:v libx264 -preset slow -crf "$crf" \
    -profile:v high -level 4.0 \
    -movflags +faststart \
    "$out"
}

echo "→ десктоп 1920×1080, CRF 27"
encode "$DESKTOP" "1920:-2" 27

echo "→ мобільний 1280, CRF 29"
encode "$MOBILE" "1280:-2" 29

echo "→ постер"
ffmpeg -y -loglevel error -i "$SRC" -ss "$POSTER_AT" -frames:v 1 \
  -vf "scale=1920:-2:flags=lanczos" -q:v 4 "$POSTER"

# Найлегше зламати мовчки: moov має стояти перед mdat.
check_faststart() {
  local file=$1 moov mdat
  moov=$(grep -abo moov "$file" | head -1 | cut -d: -f1)
  mdat=$(grep -abo mdat "$file" | head -1 | cut -d: -f1)
  if [ -z "$moov" ] || [ -z "$mdat" ] || [ "$moov" -gt "$mdat" ]; then
    echo "   faststart НЕ застосувався: $(basename "$file")" >&2
    return 1
  fi
}

echo
printf '%-18s %10s %10s  %s\n' файл розмір тривалість роздільність
for f in "$DESKTOP" "$MOBILE" "$POSTER"; do
  size=$(du -k "$f" | cut -f1)
  if [[ "$f" == *.mp4 ]]; then
    check_faststart "$f"
    probe() { ffprobe -v error -select_streams v:0 -show_entries "$1" -of default=nw=1:nk=1 "$f"; }
    printf '%-18s %8s КБ %8.1f с  %sx%s\n' "$(basename "$f")" "$size" \
      "$(probe format=duration)" "$(probe stream=width)" "$(probe stream=height)"
  else
    printf '%-18s %8s КБ\n' "$(basename "$f")" "$size"
  fi
done

echo
echo "Готово. Перевірте перший екран і закомітьте frontend/public/hero*."
