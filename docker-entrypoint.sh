#!/bin/sh
set -e

# Remove trailing slash from HEADSCALE_URL if present
HEADSCALE_URL="${HEADSCALE_URL%/}"

if [ -n "$HEADSCALE_URL" ]; then
    echo "Proxy mode: forwarding /api/v1/ → $HEADSCALE_URL/api/v1/"

    # Read the DNS resolver from /etc/resolv.conf so this works in both
    # Docker (127.0.0.11) and Kubernetes (CoreDNS ClusterIP, e.g. 10.43.0.10).
    RESOLVER=$(grep -m1 nameserver /etc/resolv.conf | awk '{print $2}')
    echo "DNS resolver: $RESOLVER"
    export RESOLVER

    # Substitute HEADSCALE_URL and RESOLVER into the nginx config template.
    # Listing variables explicitly prevents envsubst from touching nginx's
    # own $variables (like $remote_addr, $proxy_host, etc.).
    envsubst '${HEADSCALE_URL} ${RESOLVER}' \
        < /etc/nginx/headscale-gui/proxy.conf.template \
        > /etc/nginx/conf.d/default.conf

    # Tell the app to skip the URL field and use relative /api/v1/ paths
    printf '{"proxyMode":true}' > /usr/share/nginx/html/config.json
else
    echo "Static mode: user will configure the headscale URL in the UI"
    cp /etc/nginx/headscale-gui/static.conf /etc/nginx/conf.d/default.conf
    printf '{}' > /usr/share/nginx/html/config.json
fi

# Hand off to nginx
exec nginx -g 'daemon off;'
