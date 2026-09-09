#!/bin/sh
cd /home/storage/netbird
grep -q disableGeoliteUpdate config.yaml && sed -i 's/disableGeoliteUpdate: false/disableGeoliteUpdate: true/' config.yaml || sed -i '/^server:/a\  disableGeoliteUpdate: true' config.yaml
docker rm -f netbird-server netbird-netbird-server-1 2>/dev/null
docker run -d --name netbird-server --restart unless-stopped --network netbird_netbird --dns 8.8.8.8 --dns 1.1.1.1 -p 0.0.0.0:8081:80 -p 3478:3478/udp -v netbird_netbird_data:/var/lib/netbird -v /home/storage/netbird/config.yaml:/etc/netbird/config.yaml -e NB_SETUP_PAT_ENABLED=true netbirdio/netbird-server:0.77.1-local --config /etc/netbird/config.yaml 2>&1 | tail -1
echo "WAIT-25s"; sleep 25
i=0; CODE=000
while [ $i -lt 12 ]; do
  CODE=$(curl -m 4 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
  echo "TRY$i:$CODE"
  [ "$CODE" = "200" ] && break
  i=$((i+1)); sleep 10
done
if [ "$CODE" = "200" ]; then echo ALIVE; else echo DEAD; docker logs --tail 6 netbird-server 2>&1; fi
