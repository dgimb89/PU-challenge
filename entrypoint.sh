#!/bin/bash
set -e

# install npm packages
npm install

# build the app
npm run build

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"
