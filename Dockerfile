FROM node

RUN adduser --disabled-password -m -s /bin/bash appuser
WORKDIR /home/appuser

COPY package*.json ./ 
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]