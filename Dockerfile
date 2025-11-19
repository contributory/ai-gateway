FROM node:18-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir /app && chown -R appuser:appgroup /app
USER appuser
WORKDIR /app

COPY --chown=appuser:appgroup package*.json ./ 
RUN npm ci --omit=dev
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]