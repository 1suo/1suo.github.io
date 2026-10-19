#!/bin/bash
echo "1 remounting"
mount -o remount,rw / 2>/dev/null
echo "2 docker"
systemctl start docker 2>/dev/null || dockerd > /dev/null 2>&1 &
sleep 10
echo "3 netbird"
docker start netbird-server 2>/dev/null || docker run -d --name netbird-server --restart unless-stopped -v /home/storage/netbird:/etc/netbird -v netbird_data:/var/lib/netbird -p 8081:80 netbirdio/netbird-server --config /etc/netbird/config.yaml 2>/dev/null
sleep 8
echo "4 tunnel"
ssh -o StrictHostKeyChecking=accept-new -R 80:localhost:8081 nokey@localhost.run > /tmp/t.log 2>&1 &
sleep 15
echo "5 url:"
grep -o 'https://[a-z0-9-]*\.lhr\.life' /tmp/t.log
