FROM node:18-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --chown=appuser:appgroup package*.json ./ 
COPY --chown=appuser:appgroup . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]