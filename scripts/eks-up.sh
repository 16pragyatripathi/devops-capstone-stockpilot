#!/usr/bin/env bash
# Bootstrap the EKS cluster created by terraform/ and deploy StockPilot from GHCR.
#   IMAGE_TAG=<git sha> ./scripts/eks-up.sh
source "$(dirname "$0")/lib.sh"
TF="$ROOT/terraform"
REGION="$(terraform -chdir="$TF" output -raw region)"
CLUSTER="$(terraform -chdir="$TF" output -raw cluster_name)"
OWNER="${IMAGE_OWNER:-$(gh api user --jq .login 2>/dev/null || echo 16pragyatripathi)}"
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse HEAD)}"

log "Pointing kubectl at $CLUSTER ($REGION)"
aws eks update-kubeconfig --region "$REGION" --name "$CLUSTER"
kubectl get nodes -o wide
add_helm_repos

log "Applying namespace and gp3 StorageClass"
kubectl apply -f "$ROOT/k8s/namespace.yaml" -f "$ROOT/k8s/storageclass-gp3.yaml"
# The pre-created gp2 class must not also be the default.
kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class=false --overwrite 2>/dev/null || true

install_monitoring

log "Installing Traefik ingress controller (AWS NLB)"
helm upgrade --install traefik traefik/traefik --version 42.0.0 -n traefik --create-namespace \
  -f "$ROOT/k8s/ingress/traefik-values-eks.yaml" --wait

log "Deploying StockPilot $TAG"
helm upgrade --install "$RELEASE" "$ROOT/helm/stockpilot" -n "$NAMESPACE" \
  -f "$ROOT/helm/stockpilot/values-prod.yaml" \
  --set image.owner="$OWNER" --set backend.tag="$TAG" --set frontend.tag="$TAG" \
  --wait --timeout 10m

kubectl get pods,svc,ingress,hpa -n "$NAMESPACE"
LB="$(kubectl get svc -n traefik traefik -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
echo
echo "App via Ingress: http://$LB   (DNS for a new NLB can take 2-3 minutes)"
print_access
