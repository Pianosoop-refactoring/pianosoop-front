import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 150 },
    { duration: '2m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.03'],
    http_req_duration: ['p(95)<1200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.your-domain.com';
const TARGET_PATH = __ENV.TARGET_PATH || '/api/health';

export default function () {
  const res = http.get(`${BASE_URL}${TARGET_PATH}`, { tags: { test: 'stress' } });
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
