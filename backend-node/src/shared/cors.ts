// Ручний CORS, щоб зрозуміти що саме робить пакет `cors`.
//
// Браузер перед "непростим" запитом (наприклад, POST з Content-Type:
// application/json) сам надсилає preflight — OPTIONS-запит із заголовками
// Access-Control-Request-Method/-Headers. Якщо сервер не відповість
// дозвільними заголовками, браузер навіть не надішле справжній запит.
import type { Request, Response, NextFunction } from 'express';

export function cors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Authorization, Content-Type, X-CSRF-Token, Origin, X-Requested-With'
  );
  // Дозволяємо браузеру кешувати результат preflight на 5 хв,
  // щоб не слати OPTIONS перед кожним запитом
  res.setHeader('Access-Control-Max-Age', '300');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
