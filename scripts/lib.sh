# Shared helpers for the scripts in this folder.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAMESPACE="${NAMESPACE:-stockpilot}"
RELEASE="${RELEASE:-stockpilot}"
log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }

add_helm_repos() {
  helm repo add traefik https://traefik.github.io/charts >/dev/null 2>&1 || true
  helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null 2>&1 || true
  helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null 2>&1 || true
  helm repo update >/dev/null
}

install_monitoring() {
  local extra=("$@")
  log "Installing kube-prometheus-stack (Prometheus + Grafana)"
  local pw
  pw="$(kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' 2>/dev/null | base64 -d || true)"
  pw="${GRAFANA_PASSWORD:-${pw:-$(openssl rand -hex 12)}}"
  helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --version 92.10.0 -n monitoring --create-namespace \
    -f "$ROOT/monitoring/kube-prometheus-stack-values.yaml" "${extra[@]}" \
    --set grafana.adminPassword="$pw" --wait --timeout 10m
}

print_access() {
  cat <<MSG

Grafana:     kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3002:80   -> http://localhost:3002  (user admin)
             password: kubectl get secret -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 -d
Prometheus:  kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090 -> http://localhost:9090/targets
MSG
}
