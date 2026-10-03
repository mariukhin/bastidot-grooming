import type { Role } from '../shared/role.ts';

// Declaration merging: додаємо userId і роль у тип Express Request, щоб
// middleware міг типобезпечно покласти туди дані з JWT, а хендлери — прочитати.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
    }
  }
}

export {};
