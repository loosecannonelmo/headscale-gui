#!/bin/sh
set -e

# Remove trailing slash from HEADSCALE_URL if present
HEADSCALE_URL="${HEADSCALE_URL%/}"

if [ -n "$HEADSCALE_URL" ]; then
    echo "Proxy mode: forwarding /api/v1/ → $HEADSCALE_URL/api/v1/"

    # Substitute HEADSCALE_URL into the nginx config template
    # The '${HEADSCALE_URL}' argument restricts envsubst to only that variable,
    # leaving nginx's own $variables (like $remote_addr) untouched.
    envsubst '${HEADSCALE_URL}' \
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
