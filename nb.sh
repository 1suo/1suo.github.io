#!/bin/sh
# Mesh rollback: undo the exposedAddress change that broke native peers.
# Restores the last known-good control-plane address, restarts the server
# so it re-registers the working relay (rel://85.174.249.129:8081), and
# verifies the API answers on 8081.
set -x
CONF=/home/storage/netbird/config.yaml

echo "== restoring exposedAddress to http://85.174.249.129:8081 =="
sed 's#exposedAddress: "https://netbird.sodalab.pro:8081"#exposedAddress: "http://85.174.249.129:8081"#' "$CONF" > /tmp/nb.conf.new
# in-place write keeps the inode so the container bind-mount sees the change
cat /tmp/nb.conf.new > "$CONF"
rm -f /tmp/nb.conf.new
grep exposedAddress "$CONF"

echo "== restarting netbird-server =="
docker restart netbird-server
sleep 20
docker ps --format '{{.Names}} {{.Status}}' | grep -E 'netbird-server|sslh8081|tls-front|netbird-dashboard'

echo "== verifying =="
A=$(curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/api/instance)
T=$(curl -sk -m 8 --resolve netbird.sodalab.pro:8081:127.0.0.1 -o /dev/null -w '%{http_code}' https://netbird.sodalab.pro:8081/api/instance)
R=$(docker logs netbird-server --since 2m 2>&1 | grep -c '85.174.249.129:8081' || true)
echo "plain8081:$A tls8081:$T relay-reg-lines:$R"
if [ "$A" = "200" ]; then
  echo "ROLLBACK-OK: peers reconnect via rel://85.174.249.129:8081 within ~1-2 min"
else
  echo "8081 not answering - full recreate of netbird-server"
  docker rm -f netbird-server
  docker run -d --name netbird-server --restart unless-stopped --network netbird_netbird --dns 8.8.8.8 --dns 1.1.1.1 -p 127.0.0.1:18081:80 -p 3478:3478/udp -v netbird_netbird_data:/var/lib/netbird -v /home/storage/netbird/config.yaml:/etc/netbird/config.yaml:ro -e NB_SETUP_PAT_ENABLED=true netbirdio/netbird-server:0.77.1-local --config /etc/netbird/config.yaml
  sleep 25
  A2=$(curl -s -m 8 -o /dev/null -w '%{http_code}' http://127.0.0.1:8081/api/instance)
  echo "recreate8081:$A2"
fi
