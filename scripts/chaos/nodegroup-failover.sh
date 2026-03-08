#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-pianosoop}"
DEPLOYMENT="${DEPLOYMENT:-pianosoop-backend}"
NODEGROUP="${NODEGROUP:-ng-a}"

NODE_NAME="$(kubectl get nodes -l eks.amazonaws.com/nodegroup=${NODEGROUP} -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"

if [ -z "${NODE_NAME}" ]; then
  # Allow prefix input, e.g. NODEGROUP=ng-a
  NODE_NAME="$(
    kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"|"}{.metadata.labels.eks\.amazonaws\.com/nodegroup}{"\n"}{end}' \
      | awk -F'|' -v ng="${NODEGROUP}" '$2 ~ ("^" ng) {print $1; exit}'
  )"
fi

if [ -z "${NODE_NAME}" ]; then
  echo "No node found in nodegroup=${NODEGROUP}"
  exit 1
fi

echo "Target node: ${NODE_NAME}"
echo "1) cordon"
kubectl cordon "${NODE_NAME}"

echo "2) drain"
kubectl drain "${NODE_NAME}" --ignore-daemonsets --delete-emptydir-data --force --grace-period=30

echo "3) wait until at least one backend pod is Ready"
for i in {1..36}; do
  READY_COUNT="$(
    kubectl get pods -n "${NAMESPACE}" -l app="${DEPLOYMENT}" -o jsonpath='{range .items[*]}{.status.containerStatuses[0].ready}{"\n"}{end}' \
      | grep -c true || true
  )"
  if [ "${READY_COUNT}" -ge 1 ]; then
    break
  fi
  sleep 5
done

echo "Ready backend pods: ${READY_COUNT}"

echo "4) check pods"
kubectl get pods -n ${NAMESPACE} -o wide

echo "Done. To recover test node scheduling: kubectl uncordon ${NODE_NAME}"
