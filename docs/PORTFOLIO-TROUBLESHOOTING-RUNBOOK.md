# Portfolio Troubleshooting Runbook

## 1) Deployment 5xx spike mitigation

### Goal
Show zero-downtime rollout improvement using rolling strategy + probe tuning + PDB.

### Evidence to capture
- Argo CD sync screen (before/after deploy)
- `kubectl rollout status deploy/pianosoop-backend -n pianosoop`
- Grafana/CloudWatch API 5xx chart during deployment

### Command
```bash
kubectl get deploy -n pianosoop pianosoop-backend -o yaml | grep -E "maxUnavailable|maxSurge|readinessProbe|livenessProbe" -n
```

## 2) Load spike 대응 (HPA + NodeGroup)

### Goal
Show improved p95/failed rate under same k6 load.

### Before/After test commands
```bash
k6 run -e BASE_URL=https://api.your-domain.com -e TARGET_PATH=/api/health scripts/perf/k6-baseline.js
k6 run -e BASE_URL=https://api.your-domain.com -e TARGET_PATH=/api/health scripts/perf/k6-stress.js
kubectl get hpa -n pianosoop -w
kubectl get pods -n pianosoop -w
```

### Evidence to capture
- k6 summary (req/s, p95, failed rate)
- HPA scaling screenshot (`2 -> N` pods)
- Grafana CPU/Memory + latency panel

## 3) NodeGroup 장애 유도 후 서비스 지속성 검증

### Goal
Prove service continuity when one nodegroup is drained.

### Command
```bash
NAMESPACE=pianosoop DEPLOYMENT=pianosoop-backend NODEGROUP=ng-a ./scripts/chaos/nodegroup-failover.sh
```

### Evidence to capture
- drain 실행 로그
- 파드 재스케줄 결과 (`kubectl get pods -o wide`)
- 장애 구간 API 성공률(5xx 거의 없음)

## Suggested portfolio format (per issue)
- Problem (1 line)
- Baseline metric
- Root cause
- Fix
- After metric + screenshot
