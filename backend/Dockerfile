FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/

RUN npm ci

COPY backend ./backend

WORKDIR /app/backend

RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start"]
