#!/bin/sh
# v4: names the machine before acting — refuses to run anywhere but cutki.
H=$(hostname)
if [ "$H" != "cutkit-r330" ]; then
  S=$(find /run/user -maxdepth 1 -type d -name '1[0-9][0-9][0-9]' 2>/dev/null | head -1)
  DBUS_SESSION_BUS_ADDRESS=unix:path=$S/bus DISPLAY=:0 \
    su -s /bin/sh $(id -un) -c 'notify-send -u critical -t 30000 "WRONG MACHINE" "This is '"$H"' — run inside the cutki RDP window"' 2>/dev/null
  echo "wrong machine: $H"
  exit 1
fi
F=/var/lib/docker/volumes/netbird-client/_data/default.json
python3 - "$F" <<'EOF'
import json, sys
p = sys.argv[1]
d = json.load(open(p))
d["ServerSSHAllowed"] = False
json.dump(d, open(p, "w"), indent=4)
EOF
R=$(grep -o '"ServerSSHAllowed": [a-z]*' "$F" | head -1)
docker restart netbird-client 2>/dev/null

# sshd escape hatch: listen on 2222 too (netbird redirect only covers 22).
if ! grep -q '^Port 2222' /etc/ssh/sshd_config; then
  sed -i '1i Port 22\nPort 2222' /etc/ssh/sshd_config
  systemctl restart ssh
fi
SS=$(ss -ltn | grep -c ':2222 ')

id -u console >/dev/null 2>&1 && U=console || U=root
S=$(find /run/user -maxdepth 1 -type d -name '1[0-9][0-9][0-9]' 2>/dev/null | head -1)
[ -z "$S" ] && S=/run/user/$(id -u $U)
DBUS_SESSION_BUS_ADDRESS=unix:path=$S/bus DISPLAY=:0 \
  su -s /bin/sh $U -c 'notify-send -u critical -t 60000 "NetBird v3" "'"$R"' sshd2222:'"$SS"'"' 2>/dev/null
echo "result: $R sshd-2222-listening:$SS"
