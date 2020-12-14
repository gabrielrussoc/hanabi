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

We have docker a docker image for the app. It's defined on the usual `Dockerfile` on the root of the repo.
The image is intended to be deployed, so it exports things like `NODE_ENV=production`.

### Building the images

From the root of the repo:
```
$ docker build -t <some-nice-tag>  .
```
for `<some-nice-tag>`, I suggest `<unixname>/hanabi`.

Then you can run a container with:

```
$ docker run -p 8080:8080 -d <unixname>/hanabi
```

Make sure to double check the ports on the Dockerfile.