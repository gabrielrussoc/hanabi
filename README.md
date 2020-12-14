# Hanabi

How to play: https://youtu.be/4bqSWF2DF6I

## Build from scratch

To build and run this from scratch:
1. Install node and npm (this was tested with v15.4.0 but probaby works with more). Using NVM is a good way to do this.
2. Go to `interface/` and run `npm install && npm build`
3. On one terminal screen, go to `server/` and run `npm install && npm start`.
4. On the other, go to `client/` and run `npm install && npm start`.
5. You can use incognito mode on `localhost:3000` to use additional players.

## Using docker

We have docker images for both the client and server. They are `Dockerfile.server` and `Dockerfile.client`.
The reason they live in the root of the repo (and not inside `server/` and `client/`) is because they both 
depend on the interface module. In other words,
they have a local npm dependency and [this is why this is unusual for Docker](https://stackoverflow.com/questions/44654215/setting-up-docker-nodejs-application-with-local-npm-dependencies).

### Building the images

From the root of the repo:
```
$ docker build -t <some-nice-tag> -f Dockerfile.server .
```
for `<some-nice-tag>`, I suggest `<unixname>/hanabi-server`.

Then you can run a container with:

```
$ docker run -p 5001:5001 -d gabrielrc/hanabi-server
```

Make sure to double check the ports on the Dockerfile.

The same follows for the client image.