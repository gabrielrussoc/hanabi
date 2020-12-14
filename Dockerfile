# This docker file has three images:
# - One for building the server (installing deps, typescript compiler, etc)
# - One for building the client bundle (packing react into a js bundle)
# - The final image that serves the requests (and will be deployed)
# See more at:
# https://docs.docker.com/develop/develop-images/multistage-build/

# ============== SERVER BUILDER IMAGE ======================

FROM node:14 as server-builder

# Set the app directory
WORKDIR /hanabi-server

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY server/package*.json ./
# Make sure the local dependency is available on the container
# https://stackoverflow.com/questions/44654215/setting-up-docker-nodejs-application-with-local-npm-dependencies
COPY interface /interface
# npm doesn't build the interface module. So do it manually first.
RUN (cd /interface && npm ci && npm run build)
RUN npm ci

# Copy the app to the container
# See .dockerignore for ignored files
COPY server/ . 

# Build typescript
RUN npm run build

## remove packages of devDependencies (e.g typescript)
RUN npm prune --production

# ============== CLIENT BUILDER IMAGE ======================

FROM node:14 as client-builder

# Set the app directory
WORKDIR /hanabi-client

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY client/package*.json ./
# Make sure the local dependency is available on the container
# https://stackoverflow.com/questions/44654215/setting-up-docker-nodejs-application-with-local-npm-dependencies
COPY interface /interface
# npm doesn't build the interface module. So do it manually first.
RUN (cd /interface && npm ci && npm run build)
RUN npm ci


# Copy the app to the container
# See .dockerignore for ignored files
COPY client/ . 

# Build typescript
RUN npm run build

## remove packages of devDependencies (e.g typescript)
RUN npm prune --production

# ============== RUNTIME IMAGE ======================

# Runtime image
FROM node:14-slim

# Set the app directory
WORKDIR /hanabi

# Set the environment variables
ENV NODE_ENV production
ENV PROD_CLIENT_ROOT /hanabi/client-bin

# Expose the port we serve on
# This is ignored on Heroku. They will set another PORT.
ENV PORT 8080
EXPOSE ${PORT}

# Copy the compiled javascript to the container
COPY --from=server-builder hanabi-server/bin/ bin/
COPY --from=server-builder hanabi-server/node_modules/ node_modules/
COPY --from=server-builder hanabi-server/package.json package.json
# Make sure to include the client files
COPY --from=client-builder hanabi-client/build/ client-bin/

# Start the app
CMD [ "npm", "run", "start:prod" ]








