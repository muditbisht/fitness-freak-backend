#!/bin/bash

# Setup bashrc for npm and pm2
PS1='$ ' &&
source ~/.bashrc &&

# Now we have got the access of EC2 and we will start the deploy .
NODE_ENV=production
npm ci &&
pm2 stop ./src/server.js &&
pm2 start ./src/server.js