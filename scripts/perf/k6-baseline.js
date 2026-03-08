import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.your-domain.com';
const TARGET_PATH = __ENV.TARGET_PATH || '/api/health';

export default function () {
  const res = http.get(`${BASE_URL}${TARGET_PATH}`, { tags: { test: 'baseline' } });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
