# Demo

**Pragya Tripathi** · Roll No 10032 · DevOps Final Capstone

| | File |
|---|---|
| 🎬 **Presentation video** | [Watch on Google Drive](https://drive.google.com/file/d/1TLXfiFgcn7XEiKcE1aOj_w9XQatLyJ_M/view?usp=sharing) |
| 📊 **Slide deck** (PowerPoint, with speaker notes) | [StockPilot-Capstone.pptx](StockPilot-Capstone.pptx) |
| 📊 Slide deck (PDF) | [StockPilot-Capstone.pdf](StockPilot-Capstone.pdf) |

The presentation walks through the full delivery path of StockPilot, using screenshots from the
live AWS deployment:

1. **The application:** React + Vite frontend, FastAPI backend with 14 REST endpoints, PostgreSQL
   with Alembic migrations, 21 automated tests
2. **From commit to cluster:** lint and tests, Docker build, Trivy scan, GHCR push and Helm deploy,
   with every image tagged by its commit SHA
3. **CI/CD and security:** a green pipeline ending in the EKS deploy, zero fixable HIGH/CRITICAL CVEs,
   non-root containers
4. **Infrastructure as code:** Terraform-built VPC across 2 AZs, EKS 1.36 with managed nodes, and a
   keyless GitHub OIDC deploy role (64 resources)
5. **Kubernetes and Helm:** pods, services, Ingress and autoscalers running on EKS
6. **Autoscaling and monitoring:** the backend scaled from 2 to 6 pods under load, with Prometheus and Grafana
7. **Troubleshooting lab:** ImagePullBackOff, a Service with no endpoints, and a pod that runs but is never Ready

More screenshots are in [`docs/screenshots`](../docs/screenshots), command output is in
[`docs/evidence`](../docs/evidence), and the step-by-step live demo runbook is in [`docs/DEMO.md`](../docs/DEMO.md).
