FROM node:alpine

WORKDIR /usr/demo-csv-writer
COPY ./package.json  ./
COPY ./package-lock.json  ./
RUN npm install

COPY ./index.mjs  ./.

CMD ["npm", "start"]
