FROM node:18-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]