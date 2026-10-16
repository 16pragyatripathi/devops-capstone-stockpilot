# Final demo script (≈15 minutes)

Have open beforehand: the app tab, GitHub Actions tab, GHCR packages tab, Grafana and Prometheus
port-forwards, and a terminal in the repo root.

| # | Step | Show / run |
|---|------|------------|
| 1 | **Application** | Open the Ingress URL. Dashboard KPIs → Products → **New product** → adjust stock (sale) → see it on the dashboard and in Stock movements. |
| 2 | **API** | `http://<ingress>/docs`: `GET /api/products`, `POST /api/products`, `PUT /api/products/{id}`, `POST /api/products/{id}/adjust`, `DELETE /api/products/{id}`. |
| 3 | **Database** | `kubectl exec -it -n stockpilot stockpilot-postgres-0 -- psql -U stockpilot -c 'select sku,name,quantity,reorder_level from products order by id;'` and `\dt` (note `alembic_version`). |
| 4 | **Git** | Change something visible, e.g. the subtitle in `frontend/src/App.jsx` (`TITLES.dashboard`), then `git commit -am "feat(ui): ..." && git push`. |
| 5 | **CI** | Actions tab: `backend-tests` (ruff + 21 pytest tests) and `frontend-build` run in parallel. |
| 6 | **Docker** | `build-scan-push` matrix builds `stockpilot-backend` and `stockpilot-frontend` (multi-stage, non-root). |
| 7 | **Security** | Open the Trivy step log (HIGH/CRITICAL gate) and the repo's Security → Code scanning tab. |
| 8 | **Registry** | GitHub profile → Packages → `stockpilot-backend` → tag = the commit SHA. |
| 9 | **Terraform** | Walk through `terraform/main.tf` (VPC module, EKS module, node group, add-ons) and `github-oidc.tf`; `terraform output`. |
| 10 | **Kubernetes** | `kubectl get pods,svc -n stockpilot -o wide` (2+ backend, 2+ frontend, postgres-0 all Running). |
| 11 | **Helm** | `helm list -n stockpilot` and `helm history stockpilot -n stockpilot` (new revision from the pipeline). |
| 12 | **Ingress** | `kubectl get ingress -n stockpilot`, then refresh the app: the change from step 4 is live. |
| 13 | **HPA** | `./scripts/load-test.sh`, then `kubectl get hpa -n stockpilot -w` (backend scales above 2). |
| 14 | **Monitoring** | Prometheus → Status → Targets: `serviceMonitor/stockpilot/stockpilot-backend` **UP**. Grafana → "StockPilot - Application Overview": request rate, latency and HPA replicas rising under load. |
| 15 | **Failure simulation** | `kubectl apply -f troubleshooting/broken-service.yaml` → `kubectl get endpointslices -n stockpilot -l kubernetes.io/service-name=stockpilot-api-broken` (empty) → `kubectl get pods --show-labels -n stockpilot` → patch the selector → endpoints appear. Then `broken-image.yaml` → `ImagePullBackOff` → `kubectl describe` → fix. |

Rollback, if asked: `helm rollback stockpilot <revision> -n stockpilot`.

Afterwards: `./scripts/eks-down.sh` (and screenshot the `terraform destroy` output).
