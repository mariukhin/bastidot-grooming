FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Код виконується напряму з TypeScript (--experimental-strip-types),
# тому білд-кроку немає і devDependencies у рантаймі не потрібні.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

USER node

# config.ts читає PORT; має збігатися з internal_port у fly.toml.
ENV PORT=8000
EXPOSE 8000

# Запускаємо node напряму, а не через `npm start`: npm не пробрасує SIGTERM
# дочірньому процесу, а в server.ts на цьому сигналі тримається graceful shutdown.
CMD ["node", "--experimental-strip-types", "src/server.ts"]
