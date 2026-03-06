# Cloud Prep Checklist

## 1) App sanity

- [ ] Admin login works
- [ ] Member login works
- [ ] Signup request -> approve -> member appears in member list
- [ ] Member profile update (`/member/myinfo`) works
- [ ] Reservation create/cancel/update works
- [ ] Board CRUD and notification read API works

## 2) Security/env

- [ ] `JWT_SECRET` rotated to long random value
- [ ] DB password changed from default values
- [ ] `.env` files are not committed
- [ ] CORS allow-list narrowed to real domains before production

## 3) Containerization

- [ ] Frontend image build: `docker build -t pianosoop-frontend:local .`
- [ ] Backend image build: `docker build -t pianosoop-backend:local ../Pianosoop-backend-spring`
- [ ] Full stack local compose: `docker compose -f docker-compose.fullstack.yml up -d --build`

## 4) Release artifacts

- [ ] Image tags strategy decided (e.g. git sha)
- [ ] GitHub Actions pipeline added (build/test/push)
- [ ] ArgoCD app manifests prepared (dev/prod overlays)
- [ ] Terraform state/backend strategy decided (S3 + DynamoDB lock)
