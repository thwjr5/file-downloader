# file-downloader/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json and package-lock.json
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Create volume mount points
RUN mkdir -p /downloads /logs
VOLUME ["/downloads", "/logs"]

# Expose the port the app runs on
EXPOSE 3000

CMD ["node", "app.js"]