#!/usr/bin/env bash
# Remove everything from AWS. Load balancers and EBS volumes created by Kubernetes
# must go first, otherwise they block the VPC/subnet deletion in `terraform destroy`.
source "$(dirname "$0")/lib.sh"
TF="$ROOT/terraform"

log "Uninstalling Helm releases (deletes the NLB and EBS volumes)"
helm uninstall "$RELEASE" -n "$NAMESPACE" --wait 2>/dev/null || true
kubectl delete pvc --all -n "$NAMESPACE" --wait=true 2>/dev/null || true
helm uninstall traefik -n traefik --wait 2>/dev/null || true
helm uninstall kube-prometheus-stack -n monitoring --wait 2>/dev/null || true
kubectl delete pvc --all -n monitoring 2>/dev/null || true

log "Waiting for the load balancer to disappear"
for _ in $(seq 1 30); do
  kubectl get svc -A -o jsonpath='{range .items[?(@.spec.type=="LoadBalancer")]}{.metadata.name}{"\n"}{end}' 2>/dev/null | grep -q . || break
  sleep 10
done
sleep 30

log "terraform destroy"
terraform -chdir="$TF" destroy -auto-approve
