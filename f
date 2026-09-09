#!/bin/bash
mount -o remount,rw / 2>/dev/null
echo nameserver 8.8.8.8 > /etc/resolv.conf
systemctl start docker 2>/dev/null
sleep 8
docker start netbird-server 2>/dev/null || docker run -d --name netbird-server --restart unless-stopped -v /home/storage/netbird:/etc/netbird -v netbird_data:/var/lib/netbird -p 8081:80 -p 3478:3478/udp netbirdio/netbird-server --config /etc/netbird/config.yaml
docker restart netbird-client 2>/dev/null
echo 127.0.0.1 85.174.249.129 >> /etc/hosts
docker restart netbird-client
ssh -o StrictHostKeyChecking=accept-new -R 80:localhost:8081 nokey@localhost.run > /tmp/tun.log 2>&1 &
sleep 12
grep -o 'https://[a-z0-9-]*\.lhr\.life' /tmp/tun.log || cat /tmp/tun.log | head -3
echo LABFIX-DONE
