# Grafana Capture Guide

## 1) Open Grafana

```bash
kubectl -n monitoring port-forward svc/monitoring-grafana 3000:80
```

Open: `http://localhost:3000`

- ID: `admin`
- Password:

```bash
kubectl -n monitoring get secret monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d ; echo
```

## 2) Recommended dashboards for portfolio screenshots

From Grafana left menu -> `Dashboards`:

- `Kubernetes / Compute Resources / Cluster`
- `Kubernetes / Compute Resources / Node (Pods)`
- `Kubernetes / Compute Resources / Namespace (Pods)`

Set filters:

- Namespace: `pianosoop`
- Deployment/Pod: `pianosoop-backend`

## 3) Run load test while dashboard is open

```bash
kubectl -n pianosoop delete pod k6-stress --ignore-not-found
kubectl -n pianosoop run k6-stress \
  --image=grafana/k6:latest \
  --restart=Never \
  --overrides='{"spec":{"containers":[{"name":"k6-stress","image":"grafana/k6:latest","command":["k6","run","/scripts/k6-baseline.js","--stage","30s:50","--stage","60s:120","--stage","30s:0"],"env":[{"name":"BASE_URL","value":"http://pianosoop-backend.pianosoop.svc.cluster.local"},{"name":"TARGET_PATH","value":"/health"}],"volumeMounts":[{"name":"scripts","mountPath":"/scripts"}]}],"volumes":[{"name":"scripts","configMap":{"name":"k6-scripts"}}]}}'

kubectl -n pianosoop logs -f k6-stress --tail=200
kubectl -n pianosoop get hpa -w
```

## 4) Node failover test screenshot

```bash
cd /Users/okozin/Desktop/Pianosoop/Pianosoop-main
NAMESPACE=pianosoop DEPLOYMENT=pianosoop-backend NODEGROUP=ng-a ./scripts/chaos/nodegroup-failover.sh
```

After test recovery:

```bash
kubectl get nodes -L eks.amazonaws.com/nodegroup
kubectl uncordon <drained-node-name>
```

## 5) Screenshot checklist

- Before load: pod 2개, HPA replicas=2
- During load: CPU 상승, replicas 증가(HPA)
- After load: replicas 감소(scale down)
- During failover: 한 노드 cordon/drain 이벤트
- After failover: 서비스 응답 유지(health 200), pod 재스케줄 완료
