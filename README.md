# Headscale GUI

A modern web interface for [headscale](https://github.com/juanfont/headscale), the open-source Tailscale control server.

![Dashboard](docs/screenshot.png)

## Features

- **Dashboard** — network overview, node status, server health
- **Nodes** — list, inspect, rename, tag, manage routes, expire
- **Users** — create, rename, delete users
- **Pre-Auth Keys** — create, expire, delete keys per user
- **API Keys** — create, expire, delete API keys
- **ACL Editor** — edit your ACL policy with syntax highlighting
- **DNS Settings** — manage split DNS, nameservers, and search domains
- **Routes** — approve/revoke subnet routes and exit nodes

## Quick Start (Docker)

The easiest way to run headscale-gui. The container proxies API calls to your headscale server, so no CORS configuration is required.

> **Replace `https://headscale.example.com`** with the actual URL of your headscale server.

```bash
docker run -d \
  --name headscale-gui \
  -p 8080:80 \
  -e HEADSCALE_URL=https://headscale.example.com \
  ghcr.io/loosecannonelmo/headscale-gui:latest
```

Then open **http://localhost:8080** and enter your headscale API key.

### Generate an API key

```bash
headscale apikeys create --expiration 90d
```

Or if running in Kubernetes:
```bash
kubectl exec -n default deployment/headscale -- headscale apikeys create --expiration 90d
```

## Docker Compose

```yaml
services:
  headscale-gui:
    image: ghcr.io/loosecannonelmo/headscale-gui:latest
    ports:
      - "8080:80"
    environment:
      - HEADSCALE_URL=https://headscale.example.com
    restart: unless-stopped
```

## Kubernetes

See [`k8s/headscale-gui.yaml`](k8s/headscale-gui.yaml) for a ready-to-use manifest.

1. Edit the `HEADSCALE_URL` value and the `host` in the Ingress to match your setup
2. Replace `loosecannonelmo` with the actual image path
3. Apply:
   ```bash
   kubectl apply -f k8s/headscale-gui.yaml
   ```

## Environment Variables

| Variable         | Required | Description |
|------------------|----------|-------------|
| `HEADSCALE_URL`  | Yes (recommended) | URL of your headscale server. When set, the container proxies API calls and no CORS config is needed. If omitted, the login page will ask for the server URL directly. |

## Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173`. You'll be prompted to enter your headscale server URL and API key on first launch.

### Building a new release

```bash
# Build and push to registry
make push

# Deploy to Kubernetes
make rollout

# Or do both in one step
make ship
```

## Compatibility

Tested against **headscale v0.28.x**. The API changed significantly in v0.28.0 — earlier versions may not work correctly.

## License

MIT
