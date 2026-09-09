#!/bin/bash
mount -o remount,rw / 2>/dev/null
systemctl start docker 2>/dev/null || (dockerd > /tmp/docker.log 2>&1 &)
sleep 10
docker start netbird-server 2>/dev/null || docker run -d --name netbird-server --restart unless-stopped -v /home/storage/netbird:/etc/netbird -v netbird_data:/var/lib/netbird -p 8081:80 netbirdio/netbird-server --config /etc/netbird/config.yaml
sleep 5
curl -s -m 5 http://localhost:8081/api/instance | head -c 20
echo ""
echo "SERVER-OK"
