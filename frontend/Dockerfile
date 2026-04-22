FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY frontend/package*.json frontend/

RUN npm ci

COPY frontend ./frontend

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

WORKDIR /app/frontend
RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
