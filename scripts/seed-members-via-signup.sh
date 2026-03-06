#!/usr/bin/env bash

set -euo pipefail

COUNT="${1:-50}"
API_BASE_URL="${API_BASE_URL:-}"
BACKEND_ENV_FILE="${BACKEND_ENV_FILE:-../Pianosoop-backend-spring/.env}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq가 필요합니다. (macOS: brew install jq)"
  exit 1
fi

if [[ -f "$BACKEND_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$BACKEND_ENV_FILE"
fi

APP_PORT="${APP_PORT:-8080}"
API_BASE_URL="${API_BASE_URL:-http://localhost:${APP_PORT}}"
ADMIN_LOGIN_ID="${APP_SEED_ADMIN_LOGIN_ID:-}"
ADMIN_PASSWORD="${APP_SEED_ADMIN_PASSWORD:-}"

if [[ -z "$ADMIN_LOGIN_ID" || -z "$ADMIN_PASSWORD" ]]; then
  echo "관리자 로그인 정보(APP_SEED_ADMIN_LOGIN_ID, APP_SEED_ADMIN_PASSWORD)가 필요합니다."
  exit 1
fi

login_payload="$(jq -n --arg loginId "$ADMIN_LOGIN_ID" --arg password "$ADMIN_PASSWORD" '{loginId:$loginId,password:$password}')"
login_res="$(curl -sS -X POST "${API_BASE_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d "$login_payload")"
admin_token="$(echo "$login_res" | jq -r '.accessToken // empty')"

if [[ -z "$admin_token" ]]; then
  echo "관리자 로그인 실패"
  echo "$login_res"
  exit 1
fi

declare -a last_names=(김 이 박 최 정 강 조 윤 장 임 한 오 서 신 권 황 안 송 류 전 홍 고 문 양 손 배)
declare -a first_names=(민준 서준 도윤 예준 하준 지호 준우 시우 지후 유준 서연 지우 서윤 하은 지원 지민 민서 소윤 은서 다은 예은 수아 유나)

stamp="$(date +%m%d)"
created=0
skipped=0

echo "seed_started_at=$(date '+%Y-%m-%d %H:%M:%S')"
echo "api_base_url=${API_BASE_URL}"
echo "count=${COUNT}"
echo ""
echo "loginId,password,name,gender,phone"

for i in $(seq 1 "$COUNT"); do
  li=$(( (i - 1) % ${#last_names[@]} ))
  fi=$(( (i - 1) % ${#first_names[@]} ))

  name="${last_names[$li]}${first_names[$fi]}"
  gender="FEMALE"
  if (( i % 2 == 0 )); then
    gender="MALE"
  fi

  login_id="$(printf 'member%s%03d' "$stamp" "$i")"
  password="$(printf 'Piano!%s%03d' "$stamp" "$i")"
  phone="$(printf '010-%04d-%04d' $((2000 + i)) $((7000 + i)))"

  create_payload="$(jq -n \
    --arg loginId "$login_id" \
    --arg password "$password" \
    --arg name "$name" \
    --arg gender "$gender" \
    --arg phone "$phone" \
    '{loginId:$loginId,password:$password,name:$name,gender:$gender,phone:$phone}')"

  tmp_create="$(mktemp)"
  create_code="$(curl -sS -o "$tmp_create" -w "%{http_code}" -X POST "${API_BASE_URL}/api/v1/signup-requests" -H "Content-Type: application/json" -d "$create_payload")"

  if [[ "$create_code" != "200" && "$create_code" != "201" ]]; then
    skipped=$((skipped + 1))
    rm -f "$tmp_create"
    continue
  fi

  request_id="$(jq -r '.id // empty' "$tmp_create")"
  rm -f "$tmp_create"
  if [[ -z "$request_id" ]]; then
    skipped=$((skipped + 1))
    continue
  fi

  approve_code="$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH "${API_BASE_URL}/api/v1/signup-requests/${request_id}/approve" -H "Authorization: Bearer ${admin_token}")"

  if [[ "$approve_code" == "200" ]]; then
    created=$((created + 1))
    echo "${login_id},${password},${name},${gender},${phone}"
  else
    skipped=$((skipped + 1))
  fi
done

echo ""
echo "created=${created}"
echo "skipped=${skipped}"
