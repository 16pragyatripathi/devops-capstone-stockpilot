#!/usr/bin/env bash
# Local Kubernetes demo on kind: same Helm chart, Ingress, HPA and monitoring as on EKS.
source "$(dirname "$0")/lib.sh"

if ! kind get clusters | grep -qx stockpilot; then
  log "Creating kind cluster (1 control plane + 2 workers)"
  kind create cluster --config "$ROOT/scripts/kind-config.yaml" --wait 120s
fi
kubectl config use-context kind-stockpilot >/dev/null
add_helm_repos

log "Installing metrics-server (needed by the HPA)"
helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system \
  --set 'args={--kubelet-insecure-tls}' --wait

log "Installing Traefik ingress controller"
helm upgrade --install traefik traefik/traefik --version 42.0.0 -n traefik --create-namespace \
  -f "$ROOT/k8s/ingress/traefik-values-kind.yaml" --wait

install_monitoring -f "$ROOT/monitoring/kind-overrides.yaml"

log "Building images and loading them into kind"
docker build -t stockpilot-backend:local "$ROOT/backend"
docker build -t stockpilot-frontend:local "$ROOT/frontend"
kind load docker-image stockpilot-backend:local stockpilot-frontend:local --name stockpilot

log "Deploying StockPilot with Helm"
kubectl apply -f "$ROOT/k8s/namespace.yaml"
helm upgrade --install "$RELEASE" "$ROOT/helm/stockpilot" -n "$NAMESPACE" \
  -f "$ROOT/helm/stockpilot/values-dev.yaml" --wait --timeout 5m
# Same tag ("local") on every rebuild, so force new pods to pick up the new image.
kubectl rollout restart deploy -n "$NAMESPACE" -l app.kubernetes.io/part-of=stockpilot
kubectl rollout status deploy -n "$NAMESPACE" --timeout 3m

kubectl get pods,svc,ingress,hpa -n "$NAMESPACE"
echo
echo "App:  http://stockpilot.localhost   (Swagger: http://stockpilot.localhost/docs)"
print_access
