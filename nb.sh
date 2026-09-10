#!/bin/sh
# Revert the NetBird SSH hijack: restore key-based sshd on port 22 through
# the mesh, then restart the client so the profile reloads.
sed -i 's/"ServerSSHAllowed": true/"ServerSSHAllowed": false/' /var/lib/docker/volumes/netbird-client/_data/default.json
grep ServerSSHAllowed /var/lib/docker/volumes/netbird-client/_data/default.json
docker restart netbird-client
echo "reverted; mesh sshd returns in ~30s"
