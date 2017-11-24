FROM node:8
EXPOSE 3001

RUN mkdir -p /opt/app
COPY ./package.json /opt/app
COPY ./yarn.lock /opt/app
COPY ./tsconfig.json /opt/app

WORKDIR /opt/app
RUN yarn install

COPY ./src /opt/app/src
RUN yarn run build

CMD ["yarn", "run", "start"]