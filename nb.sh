#!/bin/sh
echo "== cleaning conflicts =="
docker rm -f nbs nbsrv b1 2>/dev/null
systemctl stop sslh 2>/dev/null; systemctl disable sslh 2>/dev/null
echo "== pinning 8081 to the alive server (permanent, survives reboots) =="
docker run -d --name b1 --restart always --net host alpine/socat tcp-listen:8081,fork,reuseaddr tcp:127.0.0.1:18081 >/dev/null 2>&1
sleep 3
echo "== verifying =="
A=$(curl -s -m 6 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
B=$(curl -s -m 6 -o /dev/null -w '%{http_code}' https://127.0.0.1:8443/api/instance -k --resolve netbird.sodalab.pro:8443:127.0.0.1 2>/dev/null)
S=$(docker ps --format '{{.Names}}' | grep -c netbird-server)
echo "port8081:$A caddy8443:$B server-containers:$S"
if [ "$A" = "200" ]; then
  echo "PERMANENT-OK: mesh returns on its own the moment the router forwards 8081"
else
  echo "8081 not answering - fallback: republish container directly"
  docker rm -f netbird-server 2>/dev/null
  docker run -d --name netbird-server --restart unless-stopped --network netbird_netbird --dns 8.8.8.8 --dns 1.1.1.1 -p 0.0.0.0:8081:80 -p 3478:3478/udp -v netbird_netbird_data:/var/lib/netbird -v /home/storage/netbird/config.yaml:/etc/netbird/config.yaml:ro -e NB_SETUP_PAT_ENABLED=true netbirdio/netbird-server:0.77.1-local --config /etc/netbird/config.yaml >/dev/null 2>&1
  docker rm -f b1 2>/dev/null
  sleep 25
  A2=$(curl -s -m 6 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
  echo "fallback8081:$A2"
fi
