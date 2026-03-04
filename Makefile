REGISTRY  ?= ghcr.io/loosecannonelmo
IMAGE     := headscale-gui
TAG       ?= latest
FULL_IMAGE = $(REGISTRY)/$(IMAGE):$(TAG)

# ── Development ───────────────────────────────────────────────────────────────

.PHONY: dev
dev:
	npm run dev

.PHONY: build-app
build-app:
	npm run build

# ── Docker ────────────────────────────────────────────────────────────────────

.PHONY: build
build:
	docker build -t $(FULL_IMAGE) .

.PHONY: push
push: build
	docker push $(FULL_IMAGE)

# Run the container locally for testing
.PHONY: run
run:
	docker run --rm -p 8080:80 \
		-e HEADSCALE_URL=https://headscale.example.com \
		$(FULL_IMAGE)

# ── Kubernetes ────────────────────────────────────────────────────────────────

# Deploy/update manifests (first deploy)
.PHONY: deploy
deploy:
	kubectl apply -f k8s/headscale-gui.yaml

# Roll out a new image version after push
.PHONY: rollout
rollout:
	kubectl rollout restart deployment/headscale-gui -n default
	kubectl rollout status deployment/headscale-gui -n default

# Full cycle: build, push, rollout
.PHONY: ship
ship: push rollout

.PHONY: logs
logs:
	kubectl logs -f deployment/headscale-gui -n default
