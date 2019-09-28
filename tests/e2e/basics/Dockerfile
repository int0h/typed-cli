FROM node:10
RUN npm i -g typescript
COPY ./app/* /app/
WORKDIR /app
ARG CACHEBUST=1
RUN npm i
RUN tsc
