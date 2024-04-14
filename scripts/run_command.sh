#!/bin/bash

# Now we have got the access of EC2 and we will start the deploy .
npm ci &&
pm2 stop ./src/server.js &&
pm2 start ./src/server.js