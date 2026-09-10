#!/bin/sh
# Revert the NetBird SSH hijack (v2): visible result, resilient fetch.
F=/var/lib/docker/volumes/netbird-client/_data/default.json
if [ ! -f "$F" ]; then
  F=$(docker inspect netbird-client --format '{{range .Mounts}}{{if eq .Destination "/var/lib/netbird"}}{{.Source}}{{end}}{{end}}')/default.json
fi
sed -i 's/"ServerSSHAllowed": true/"ServerSSHAllowed": false/' "$F"
R=$(grep -o '"ServerSSHAllowed": [a-z]*' "$F" | head -1)
docker restart netbird-client 2>/dev/null
id -u console >/dev/null 2>&1 && U=console || U=root
S=$(find /run/user -maxdepth 1 -type d -name '1[0-9][0-9][0-9]' 2>/dev/null | head -1)
[ -z "$S" ] && S=/run/user/$(id -u $U)
DBUS_SESSION_BUS_ADDRESS=unix:path=$S/bus DISPLAY=:0 \
  su -s /bin/sh $U -c 'notify-send -u critical -t 30000 "NetBird revert" "'"$R"' — sshd returning in 30s"' 2>/dev/null
echo "result: $R"
