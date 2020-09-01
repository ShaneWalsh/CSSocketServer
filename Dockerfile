FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json /usr/src/app

RUN npm install
RUN ls /usr/src/app/

COPY . /usr/src/app
RUN ls /usr/src/app/

EXPOSE 5000

CMD [ "node", "Server.js" ]