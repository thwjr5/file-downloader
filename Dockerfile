# file-downloader/Dockerfile
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Add shadow package to handle user/group modifications
RUN apk add --no-cache shadow

# Create a non-root user to run the application
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/sh -m appuser

# Install app dependencies
# Copy package.json and package-lock.json
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Create volume mount points and set permissions
RUN mkdir -p /downloads /logs && \
    chown -R appuser:appuser /usr/src/app /downloads /logs

VOLUME ["/downloads", "/logs"]

# Expose the port the app runs on
EXPOSE 3000

# Create entrypoint script to handle UID/GID mapping
RUN echo '#!/bin/sh\n\
if [ ! -z "$PUID" ] && [ ! -z "$PGID" ]; then\n\
  usermod -o -u $PUID appuser\n\
  groupmod -o -g $PGID appuser\n\
  chown -R appuser:appuser /usr/src/app /downloads /logs\n\
fi\n\
exec su-exec appuser node app.js\n\
' > /entrypoint.sh && \
chmod +x /entrypoint.sh

# Add su-exec to run the app as the non-root user
RUN apk add --no-cache su-exec

ENTRYPOINT ["/entrypoint.sh"]