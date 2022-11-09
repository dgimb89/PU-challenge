#!/bin/bash
set -e

# install npm packages
npm install

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"
