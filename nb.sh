#!/bin/sh
cd /home/storage/netbird
grep -q disableGeoliteUpdate config.yaml && sed -i 's/disableGeoliteUpdate: false/disableGeoliteUpdate: true/' config.yaml || sed -i '/^server:/a\  disableGeoliteUpdate: true' config.yaml
grep disableGeoliteUpdate config.yaml
docker compose up -d --force-recreate netbird-server 2>&1 | tail -1
echo "WAIT-25s"; sleep 25
i=0; CODE=000
while [ $i -lt 12 ]; do
  CODE=$(curl -m 4 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
  echo "TRY$i:$CODE"
  [ "$CODE" = "200" ] && break
  i=$((i+1)); sleep 10
done
if [ "$CODE" = "200" ]; then echo ALIVE; else echo DEAD; docker logs --tail 6 netbird-server 2>&1; fi
