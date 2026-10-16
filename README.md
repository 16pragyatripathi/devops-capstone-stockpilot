# StockPilot: Inventory Management on Kubernetes

[![StockPilot CI/CD](https://github.com/16pragyatripathi/devops-capstone-stockpilot/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/16pragyatripathi/devops-capstone-stockpilot/actions/workflows/ci-cd.yml)

StockPilot is a small SaaS-style **inventory management** app for warehouses and offices. It tracks
products and categories, records every stock movement (restock, sale, return, damage…), flags
items at or below their reorder level, and reports stock value per category.

This repository is my DevOps final capstone. It takes the app from a laptop to a monitored
Kubernetes cluster on AWS:

```text
Developer ── git push ──► GitHub
                             │
                             ▼
                      GitHub Actions
            ┌────────────────┼──────────────────────────────┐
            │ ruff + pytest  │ npm build                     │
            └───────┬────────┴──────────┐                    │
                    ▼                   ▼                    │
          docker build backend   docker build frontend       │
                    │                   │                    │
                    └──► Trivy scan (fail on HIGH/CRITICAL) ◄┘
                                 │
                                 ▼
                 ghcr.io/<owner>/stockpilot-*:<git-sha>
                                 │
            Terraform ──► AWS VPC + EKS (OIDC deploy role, no stored keys)
                                 │
                                 ▼
                     helm upgrade --install (Helm chart)
                                 │
     Traefik Ingress (AWS NLB) ──┼── /      ► frontend  (React + Nginx, 2-4 pods, HPA)
                                 └── /api   ► backend   (FastAPI, 2-6 pods, HPA)
                                                   │
                                                   ▼
                                           PostgreSQL (StatefulSet + gp3 EBS)
                                                   │
                     ServiceMonitor ──► Prometheus ──► Grafana dashboard + alert rules
```

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, responsive CSS (sidebar → drawer, tables → cards on phones) |
| Backend | FastAPI, SQLAlchemy 2, Pydantic v2 |
| Database | PostgreSQL 16, Alembic migrations (schema + demo seed data) |
| Tests | Pytest (21 tests, in-memory SQLite), Ruff lint |
| Containers | Multi-stage Dockerfiles, non-root users, Docker Compose |
| CI/CD | GitHub Actions: test → build → Trivy → GHCR → Helm deploy |
| Security | Trivy image scan (gate + SARIF to GitHub Security), SHA-pinned actions, OIDC to AWS, restricted Pod Security |
| Infrastructure | Terraform: VPC (2 public + 2 private subnets, NAT), EKS 1.34, managed node group, EBS CSI |
| Orchestration | Kubernetes, Helm chart, Traefik Ingress, HPA, PDBs, liveness/readiness/startup probes |
| Observability | `/metrics` (Prometheus format), kube-prometheus-stack, Grafana dashboard, PrometheusRules |

---

## Repository layout

```text
.
├── backend/                 FastAPI app
│   ├── app/                 main.py, models, schemas, routers/, metrics.py
│   ├── alembic/versions/    0001 schema, 0002 demo data
│   ├── tests/               pytest suite (conftest.py uses in-memory SQLite)
│   └── Dockerfile           multi-stage, runs as uid 10001
├── frontend/                React + Vite app
│   ├── src/                 App.jsx, views/, components/, styles.css
│   ├── default.conf.template  Nginx config (serves SPA, proxies /api)
│   └── Dockerfile           Node build stage → unprivileged Nginx runtime
├── docker-compose.yml       postgres + backend + frontend
├── .github/workflows/       ci-cd.yml
├── terraform/               VPC, EKS, GitHub OIDC deploy role
├── k8s/                     namespace, gp3 StorageClass, Traefik values
├── helm/stockpilot/         Helm chart (values.yaml, values-dev.yaml, values-prod.yaml)
├── monitoring/              kube-prometheus-stack values, Grafana dashboard JSON
├── troubleshooting/         deliberately broken manifests (3 labs)
├── scripts/                 kind-up.sh, eks-up.sh, eks-down.sh, load-test.sh
└── docs/                    demo script, screenshots
```

---

## 1. The application

### UI

* **Dashboard**: KPI cards (products, units, inventory value, low stock, out of stock), a reorder
  list with one-click restock, value-by-category bars, and a recent activity feed.
* **Products**: search by name/SKU/supplier, filter by stock status and category, create/edit/delete,
  adjust stock.
* **Stock movements**: the full audit trail of every quantity change.
* **Categories**: create and delete. Deleting a category keeps its products as "Uncategorised".
* Loading skeletons, an API-unreachable banner with retry, toasts, keyboard-closable modals.

### REST API

Swagger UI: `/docs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness: the process is up |
| GET | `/ready` | Readiness: the database answers `SELECT 1` (503 otherwise) |
| GET | `/metrics` | Prometheus metrics (HTTP + business) |
| GET | `/api/products?q=&status=&category_id=` | List/search/filter products |
| GET | `/api/products/{id}` | One product |
| POST | `/api/products` | Create (409 on duplicate SKU, 400 on unknown category) |
| PUT | `/api/products/{id}` | Update details (quantity changes only via `/adjust`) |
| DELETE | `/api/products/{id}` | Delete product and its history |
| POST | `/api/products/{id}/adjust` | Record a stock movement (`change`, `reason`, `note`); can't go below 0 |
| GET | `/api/movements?product_id=&limit=` | Stock movement history |
| GET | `/api/categories` | Categories with product counts |
| POST | `/api/categories` | Create category (409 on duplicate name) |
| DELETE | `/api/categories/{id}` | Delete category |
| GET | `/api/stats` | Dashboard KPIs and value by category |

### Data model

`categories` 1─* `products` 1─* `stock_movements`. Product status is computed from quantity:
`out_of_stock` (0), `low_stock` (≤ reorder level), or `in_stock`. Migrations live in
`backend/alembic/versions/`. The backend container runs `alembic upgrade head` on start. A
PostgreSQL advisory lock makes concurrent replicas take turns, so only one of them migrates.

---

## 2. Run locally

### Docker Compose (whole stack)

```bash
docker compose up --build
# App:      http://localhost:3000
# Swagger:  http://localhost:8000/docs
# Metrics:  http://localhost:8000/metrics
docker compose down        # add -v to drop the database volume
```

If port 3000 is taken: `FRONTEND_PORT=3001 docker compose up --build`.

### Backend only

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+psycopg://stockpilot:stockpilot@localhost:5432/stockpilot
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend only

```bash
cd frontend && npm install && npm run dev     # http://localhost:5173, proxies /api to :8000
```

---

## 3. Tests and code quality

```bash
cd backend
ruff check .
pytest -v
```

The 21 tests cover health/readiness/metrics, category CRUD, product CRUD, validation, duplicate SKU,
search and filters, stock adjustments (including "can't sell more than you have"), the movement
audit trail, and the stats endpoint. `tests/conftest.py` overrides the `get_db` dependency with an
**in-memory SQLite database**, so tests never touch PostgreSQL.

Pipeline rule: if lint or a test fails, nothing gets built or pushed.

---

## 4. Docker

| Image | Build | Runtime user | Notes |
|---|---|---|---|
| `stockpilot-backend` | 2 stages: wheels built, then installed into a slim image | `app` (uid 10001) | pip/setuptools removed from the runtime image; `HEALTHCHECK` on `/health` |
| `stockpilot-frontend` | 2 stages: `node:24-alpine` builds, `nginx-unprivileged` serves | `nginx` (uid 101), port 8080 | No Node in the final image; `BACKEND_URL` is rendered into the Nginx config at start |

```bash
docker build -t stockpilot-backend:local ./backend
docker build -t stockpilot-frontend:local ./frontend
docker run --rm stockpilot-backend:local id     # uid=10001(app)
```

---

## 5. CI/CD (GitHub Actions)

`.github/workflows/ci-cd.yml` runs on every push and pull request to `main`:

| Job | Steps |
|---|---|
| `backend-tests` | Python 3.12 → `ruff check` → `pytest -v` (JUnit report uploaded) |
| `frontend-build` | Node 24 → `npm ci` → `npm run build` |
| `build-scan-push` (matrix: backend, frontend) | Buildx build (GHA cache) → **Trivy** (fails on fixable HIGH/CRITICAL) → SARIF to GitHub Security → push `ghcr.io/<owner>/stockpilot-<component>:<git-sha>` (main only) |
| `deploy` | OIDC → AWS role → `aws eks update-kubeconfig` → `helm upgrade --install --atomic` with the new SHA → smoke test through the Ingress |

* Images are tagged with the **full commit SHA**, never `latest`. Every pod traces back to a commit.
* Every third-party action is **pinned to a commit SHA**. In 2026, attackers hijacked
  `aquasecurity/trivy-action`'s version tags, and pinning to a SHA protects against that.
* The deploy job uses **GitHub OIDC**, so no AWS keys are stored in GitHub. It runs only when the
  repository variable `AWS_DEPLOY_ROLE_ARN` is set, which means the cluster exists. While the
  cluster is torn down, the pipeline still tests, scans and publishes.

Repository variables used by `deploy`: `AWS_DEPLOY_ROLE_ARN` (Terraform output), `AWS_REGION`,
`EKS_CLUSTER_NAME`.

---

## 6. Security scanning (Trivy)

Trivy scans each built image for known CVEs in both **OS packages** (Debian / Alpine) and
**application libraries** (Python wheels, npm packages bundled in the image). The gate is
`severity: HIGH,CRITICAL` with `ignore-unfixed: true` and `exit-code: 1`. The build fails only on
serious vulnerabilities that already have a fix, so every failure has a concrete remedy.

**What the scan found and how it was fixed.** The first local scan of the backend image reported 4 HIGH
findings: `urllib3` (CVE-2026-97687, TLS settings ignored when going through an HTTPS proxy;
CVE-2026-97689, unbounded memory use in the chunk parser), `msgpack` (GHSA-6v7p-g79w-8964,
out-of-bounds read) and `setuptools` (CVE-2025-47273, path traversal). None of these were
StockPilot dependencies. They were copies vendored inside **pip** in the base image. The app never
runs pip at runtime, so the Dockerfile now removes pip, setuptools and ensurepip after installing
the wheels. The rescan is clean for HIGH/CRITICAL, and the attack surface is smaller too. All
severities are still uploaded as SARIF to the repository's Security tab for review.

Other controls: non-root containers, `readOnlyRootFilesystem`, all Linux capabilities dropped,
`seccompProfile: RuntimeDefault`, a `restricted` Pod Security label on the namespace, a random
PostgreSQL password generated by Helm, and `.gitignore` covering `.env`, `*.tfvars` and Terraform
state.

---

## 7. Terraform (AWS)

See [terraform/README.md](terraform/README.md). In short:

```bash
cd terraform
terraform init && terraform plan -out tfplan && terraform apply tfplan
$(terraform output -raw configure_kubectl)
```

Creates: VPC `10.20.0.0/16` with **2 public** subnets (NAT, load balancers) and **2 private**
subnets (worker nodes) across 2 AZs; an **EKS** cluster with a managed node group (2 × t3.medium,
autoscaling 2–4); EKS add-ons (VPC CNI, CoreDNS, kube-proxy, metrics-server, EBS CSI driver via
Pod Identity); and the GitHub OIDC deploy role. Default region: `ap-south-1`.

---

## 8. Kubernetes + Helm

### On EKS

```bash
./scripts/eks-up.sh            # namespace, gp3 StorageClass, kube-prometheus-stack, Traefik, StockPilot
kubectl get pods,svc,ingress,hpa -n stockpilot
helm list -A
```

### Locally on kind (same chart, Ingress, HPA, monitoring)

```bash
./scripts/kind-up.sh           # 3-node kind cluster → http://stockpilot.localhost
```

### What the chart deploys (`helm/stockpilot`)

| Resource | Details |
|---|---|
| Deployments | `stockpilot-backend`, `stockpilot-frontend`: 2+ replicas, rolling updates with `maxUnavailable: 0` |
| Probes | backend: startup + liveness `/health`, readiness `/ready`; frontend: `/nginx-health` |
| Services | ClusterIP `stockpilot-backend:8000`, `stockpilot-frontend:80`, headless `stockpilot-postgres` |
| StatefulSet | PostgreSQL 16 with a PersistentVolumeClaim (gp3 on EKS) |
| Secret | DB credentials (random on first install, reused on upgrades) |
| Ingress | class `traefik`: `/api`, `/docs`, `/openapi.json` → backend; `/` → frontend |
| HPA | backend 2→6 at 60% CPU; frontend 2→4 at 70% CPU |
| PodDisruptionBudgets | keep at least one pod of each during node drains |
| ServiceMonitor, PrometheusRule, dashboard ConfigMap | monitoring wiring (see below) |

Values files: `values.yaml` (defaults), `values-dev.yaml` (kind, local images), `values-prod.yaml` (EKS, gp3).

Why Traefik and not ingress-nginx: the Kubernetes project retired ingress-nginx in March 2026, so
it no longer gets security fixes. Traefik implements the same standard `Ingress` resource.

### Autoscaling demo

```bash
./scripts/load-test.sh                 # in-cluster load generators hit the backend
kubectl get hpa -n stockpilot -w       # watch replicas go 2 → 3 → 4 …
```

---

## 9. Monitoring

* The backend exposes `/metrics`: `http_requests_total`, `http_request_duration_seconds` (from
  prometheus-fastapi-instrumentator), plus business metrics `stockpilot_stock_movements_total{reason}`,
  `stockpilot_units_moved_total`, `stockpilot_inventory_value` and `stockpilot_low_stock_products`.
* **kube-prometheus-stack** installs Prometheus, Grafana, kube-state-metrics and the operator
  (`monitoring/kube-prometheus-stack-values.yaml`).
* The chart's **ServiceMonitor** makes Prometheus scrape the backend every 15 s.
* The **Grafana dashboard** "StockPilot - Application Overview" is loaded automatically through the
  sidecar. Panels: req/s, 5xx error rate, p95 latency, pods up, inventory value, products needing
  reorder, requests by endpoint, latency by endpoint, status classes, stock movements by reason,
  backend CPU per pod, and HPA replicas.
* **PrometheusRule** alerts: backend down, error rate > 5 %, p95 > 1 s, low stock.

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090   # /targets
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3002:80        # admin / see below
kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 -d
```

---

## 10. Troubleshooting labs

| Lab | Apply | Symptom | Root cause / fix |
|---|---|---|---|
| Broken image | `kubectl apply -f troubleshooting/broken-image.yaml` | `ImagePullBackOff` | `kubectl describe pod` → tag doesn't exist → `kubectl set image` to a real SHA tag |
| Broken Service | `kubectl apply -f troubleshooting/broken-service.yaml` | Service has no endpoints | selector `stockpilot-api` ≠ pod label `stockpilot-backend`, and wrong targetPort → patch selector/port |
| Broken readiness | `kubectl apply -f troubleshooting/broken-readiness.yaml` | `Running` but `0/1 READY` | `/ready` returns 503 (bad DB password); readiness keeps it out of the Service |

Each file has the investigation commands and the fix in its header comments.

---

## 11. Final demo script

See [docs/DEMO.md](docs/DEMO.md) for the step-by-step presentation: app → Swagger → database →
commit → pipeline → images → Trivy → GHCR → Terraform → kubectl/helm → Ingress → HPA → Grafana →
troubleshooting.

## 12. Clean up AWS

```bash
./scripts/eks-down.sh     # removes the load balancer and volumes first, then terraform destroy
```
