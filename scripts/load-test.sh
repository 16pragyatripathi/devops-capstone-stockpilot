#!/usr/bin/env bash
# Generate CPU load on the backend from inside the cluster so the HPA scales out.
#   ./scripts/load-test.sh            # 4 workers for 3 minutes
#   WORKERS=8 DURATION=300 ./scripts/load-test.sh
# In another terminal: kubectl get hpa -n stockpilot -w
source "$(dirname "$0")/lib.sh"
WORKERS="${WORKERS:-4}"
DURATION="${DURATION:-180}"
URL="http://${RELEASE}-backend:8000"

kubectl delete pod -n "$NAMESPACE" -l app=loadgen --ignore-not-found --wait=true >/dev/null
for i in $(seq 1 "$WORKERS"); do
  kubectl run "loadgen-$i" -n "$NAMESPACE" --labels=app=loadgen --restart=Never \
    --image=curlimages/curl:8.11.1 \
    --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":100,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"loadgen","image":"curlimages/curl:8.11.1","command":["sh","-c","end=$(( $(date +%s) + '"$DURATION"' )); while [ $(date +%s) -lt $end ]; do for p in /api/stats /api/products /api/movements /api/categories; do curl -s -o /dev/null '"$URL"'$p; done; done"],"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}},"resources":{"requests":{"cpu":"50m","memory":"16Mi"},"limits":{"cpu":"300m","memory":"64Mi"}}}]}}' \
    >/dev/null
done
echo "Started $WORKERS load generators for ${DURATION}s against $URL"
echo "Watch:  kubectl get hpa -n $NAMESPACE -w"
echo "Stop:   kubectl delete pod -n $NAMESPACE -l app=loadgen"
