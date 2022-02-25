FROM node:16

WORKDIR /app

# Install grpcwebproxy
RUN wget https://github.com/improbable-eng/grpc-web/releases/download/v0.15.0/grpcwebproxy-v0.15.0-linux-x86_64.zip
RUN unzip grpcwebproxy-v0.15.0-linux-x86_64.zip
RUN cp /app/dist/grpcwebproxy-v0.15.0-linux-x86_64 /usr/local/bin/grpcwebproxy
RUN chmod +x /usr/local/bin/grpcwebproxy

COPY utils.tgz ./
COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx tsc main.ts
CMD "node" "main.js"