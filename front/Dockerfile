# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_BASE_URL=http://localhost:3000
ARG VITE_H3_RESOLUTION=8
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_H3_RESOLUTION=$VITE_H3_RESOLUTION
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
