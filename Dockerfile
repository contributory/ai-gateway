FROM node

RUN adduser -m -s /bin/bash appuser
WORKDIR /home/appuser

COPY package*.json ./ 
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]