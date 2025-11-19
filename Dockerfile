FROM node

RUN adduser --disabled-password --gecos "" appuser

COPY package*.json ./ 
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]