FROM node

# Tạo user
RUN useradd -m -s /bin/bash appuser

WORKDIR /home/appuser

COPY --chown=appuser:appuser package*.json ./ 
COPY --chown=appuser:appuser . .

USER appuser

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]