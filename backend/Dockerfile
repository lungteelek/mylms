FROM node:20-alpine

WORKDIR /app/backend

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN mkdir -p uploads/videos

EXPOSE 3000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run seed && npm start"]
