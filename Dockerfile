FROM node:latest
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY ./src ./src
COPY ./views ./views
COPY ./passport-config.js ./passport-config.js
COPY ./server.js ./server.js

EXPOSE 80
CMD ["node", "server.js"]