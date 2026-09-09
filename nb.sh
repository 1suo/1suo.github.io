#!/bin/sh
cd /home/storage/netbird
docker rm -f netbird-server netbird-netbird-server-1 2>/dev/null
cp config.yaml.bak-auth config.yaml
docker compose up -d 2>&1 | tail -2
echo "WAITING-25s"
sleep 25
docker ps --format '{{.Names}} {{.Status}}' | grep netbird
echo "LOGS:"
docker logs --tail 4 netbird-server 2>&1
echo "API-TEST:"
i=0; CODE=000
while [ $i -lt 12 ]; do
  CODE=$(curl -m 4 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
  echo "TRY$i:$CODE"
  [ "$CODE" = "200" ] && break
  i=$((i+1)); sleep 10
done
if [ "$CODE" = "200" ]; then
  echo ALIVE
else
  echo "DEAD-EXIT-LOGS:"
  docker logs --tail 6 netbird-server 2>&1
fi
