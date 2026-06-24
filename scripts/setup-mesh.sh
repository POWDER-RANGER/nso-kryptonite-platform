#!/bin/bash
# NSO Kryptonite Platform — Mesh Node Provisioning
# Usage: ./scripts/setup-mesh.sh <node-type> <gateway-address>
# node-type: command-node | sensor | target | redirector

set -e

NODE_TYPE=${1:-command-node}
GATEWAY_ADDRESS=${2:-}

echo "=========================================="
echo "NSO Kryptonite — Mesh Node Setup"
echo "=========================================="
echo "Node Type: $NODE_TYPE"
echo "Gateway:   ${GATEWAY_ADDRESS:-auto-discover}"
echo ""

if [ -z "$GATEWAY_ADDRESS" ]; then
    echo "[*] Auto-discovering mesh gateway..."
    # Try mDNS discovery
    GATEWAY_ADDRESS=$(avahi-browse -r _kryptonite._tcp 2>/dev/null | grep address | head -1 | awk '{print $2}')
    if [ -z "$GATEWAY_ADDRESS" ]; then
        echo "❌ Could not auto-discover gateway. Please provide address:"
        echo "   ./scripts/setup-mesh.sh $NODE_TYPE <gateway-ip>"
        exit 1
    fi
    echo "✓ Discovered gateway at $GATEWAY_ADDRESS"
fi

# Generate WireGuard keys
echo ""
echo "[*] Generating WireGuard keypair..."
WG_PRIVATE=$(wg genkey)
WG_PUBLIC=$(echo "$WG_PRIVATE" | wg pubkey)

echo "✓ Public key: ${WG_PUBLIC:0:16}..."

# Register with mesh gateway
echo ""
echo "[*] Registering with mesh gateway..."
curl -X POST "http://$GATEWAY_ADDRESS:3000/api/v1/mesh/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"nodeType\": \"$NODE_TYPE\",
        \"publicKey\": \"$WG_PUBLIC\",
        \"hostname\": \"$(hostname)\"
    }" 2>/dev/null | tee /tmp/mesh-registration.json

# Extract peer config
WG_ENDPOINT=$(cat /tmp/mesh-registration.json | grep -o '"endpoint":"[^"]*"' | cut -d'"' -f4)
WG_PORT=$(cat /tmp/mesh-registration.json | grep -o '"port":[0-9]*' | cut -d':' -f2)
GATEWAY_PUBLIC_KEY=$(cat /tmp/mesh-registration.json | grep -o '"gatewayPublicKey":"[^"]*"' | cut -d'"' -f4)
NODE_IP=$(cat /tmp/mesh-registration.json | grep -o '"assignedIp":"[^"]*"' | cut -d'"' -f4)

# Create WireGuard config
echo ""
echo "[*] Configuring WireGuard..."
cat > /etc/wireguard/wg0.conf <<EOF
[Interface]
PrivateKey = $WG_PRIVATE
Address = $NODE_IP/24
ListenPort = 51820

[Peer]
PublicKey = $GATEWAY_PUBLIC_KEY
Endpoint = $WG_ENDPOINT:$WG_PORT
AllowedIPs = 10.200.200.0/24
PersistentKeepalive = 25
EOF

chmod 600 /etc/wireguard/wg0.conf

# Start WireGuard
echo ""
echo "[*] Starting WireGuard..."
wg-quick up wg0 2>/dev/null || wg-quick down wg0 && wg-quick up wg0

# Test mesh connectivity
echo ""
echo "[*] Testing mesh connectivity..."
ping -c 3 10.200.200.1 >/dev/null 2>&1 && echo "✓ Gateway reachable" || echo "⚠ Gateway unreachable (check firewall)"

# Done
echo ""
echo "=========================================="
echo "✓ Mesh node provisioned!"
echo "=========================================="
echo ""
echo "Node Details:"
echo "  Type:       $NODE_TYPE"
echo "  IP:         $NODE_IP"
echo "  Public Key: ${WG_PUBLIC:0:16}..."
echo "  Gateway:    $WG_ENDPOINT:$WG_PORT"
echo ""
echo "Status: systemctl status wg-quick@wg0"
echo "Logs:   journalctl -u wg-quick@wg0 -f"
echo ""
