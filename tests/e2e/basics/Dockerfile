FROM node:10
RUN npm i -g typescript
COPY ./app/* /app/
WORKDIR /app
RUN npm i
RUN tsc
