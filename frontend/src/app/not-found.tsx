import Link from 'next/link';

const NotFound = () => {
  return (
    <div>
      <h1>🚫 Сторінка не знайдена</h1>
      <Link href="/">На головну</Link>
    </div>
  );
};

export default NotFound;
