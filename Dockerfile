FROM node:13.12-slim

RUN apt-get update && apt-get install -y vim

WORKDIR /code/

ADD package-lock.json /code/package-lock.json
ADD package.json /code/package.json

RUN npm install

ADD utils /code/utils
ADD commands /code/commands
ADD test /code/test
ADD . /code/

ENTRYPOINT "/bin/bash"
