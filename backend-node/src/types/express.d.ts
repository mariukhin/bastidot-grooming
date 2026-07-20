// Declaration merging: додаємо userId у тип Express Request, щоб middleware
// міг типобезпечно покласти туди id з JWT, а хендлери — прочитати.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
