# image
FROM node:16-alpine

# WORKDIR은 명력을 실행하기 위한 디렉토리를 설정합니다.
WORKDIR /usr/src/node

COPY package*.json ./
# package.json에 있는 module을 install합니다
RUN npm install

# node_modules가 설치 된 이후 root(.) directory전체를 복제합니다.
COPY . /usr/src/node

# script를 실행합니다.
CMD ["npm","run","dev"]