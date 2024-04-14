#!/bin/bash

# Now we have got the access of EC2 and we will start the deploy .
cd /home/ubuntu/server &&
git checkout main &&
git fetch --all &&
git reset --hard origin/main &&
git pull origin main &&
npm ci &&
pm2 stop ./src/server.js &&
pm2 start ./src/server.js