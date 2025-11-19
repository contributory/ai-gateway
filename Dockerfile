FROM node

RUN useradd -m -s /bin/bash appuser
WORKDIR /home/appuser

COPY package*.json ./ 
COPY . .
RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]