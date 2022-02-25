FROM node:16

WORKDIR /app

COPY utils.tgz ./
COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx tsc main.ts
CMD "node" "main.js"