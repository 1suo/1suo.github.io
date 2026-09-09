#!/bin/sh
docker restart netbird-server 2>/dev/null
while true; do
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=20 -o ServerAliveCountMax=3 -R kosmeo918:80:localhost:8081 nokey@localhost.run
  sleep 3
done
