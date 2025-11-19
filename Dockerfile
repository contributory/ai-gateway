FROM aergo/node


COPY package*.json ./ 
COPY . .
RUN npm run build
RUN addgroup -S appgroup
USER appuser

EXPOSE 3000
CMD ["npm", "start"]