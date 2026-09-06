#!/usr/bin/env bash
# Disposable GitHub runner only. Django must already listen on 127.0.0.1:8001.
set -Eeuo pipefail
[[ $EUID == 0 && ${GITHUB_ACTIONS:-} == true ]] || exit 2
[[ ! -e /opt/taji-web && ! -e /etc/taji-web ]] || exit 2
SOURCE=${1:?Falta checkout}
WORK=$(mktemp -d /tmp/taji-web-ci-XXXXXX)
git -c safe.directory="$SOURCE" clone --no-hardlinks "$SOURCE" "$WORK/source"
git -C "$WORK/source" checkout -B main
git -C "$WORK/source" config user.name 'Taji Web CI'
git -C "$WORK/source" config user.email 'ci@example.invalid'
mkdir -p /opt/taji-web "$WORK/bin"
git clone --bare "$WORK/source" /opt/taji-web/repository.git
cat >"$WORK/bin/certbot" <<'CERTBOT'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /etc/letsencrypt/live/web.taji.test
openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
  -subj /CN=web.taji.test -addext subjectAltName=DNS:web.taji.test \
  -keyout /etc/letsencrypt/live/web.taji.test/privkey.pem \
  -out /etc/letsencrypt/live/web.taji.test/fullchain.pem
cp /etc/letsencrypt/live/web.taji.test/fullchain.pem /usr/local/share/ca-certificates/taji-web-ci.crt
update-ca-certificates
CERTBOT
chmod 0755 "$WORK/bin/certbot"
export PATH="$WORK/bin:$PATH"
bash "$WORK/source/deploy/vps.sh" install web.taji.test ci@example.invalid http://127.0.0.1:8001
FIRST=$(readlink -f /opt/taji-web/current)
taji-web-deploy update
[[ $(readlink -f /opt/taji-web/current) == "$FIRST" ]]
# Real auth through HTTPS Nginx; exercise refresh cookie, not just the static page.
curl -fsS --resolve web.taji.test:443:127.0.0.1 -c "$WORK/cookies" \
  -H 'Content-Type: application/json' -H 'Origin: https://web.taji.test' \
  -d '{"email":"admin@sprint1.taji.test","password":"TajiSprint1-Test2026!"}' \
  https://web.taji.test/api/v1/auth/login/ >"$WORK/login.json"
curl -fsS --resolve web.taji.test:443:127.0.0.1 -b "$WORK/cookies" -X POST \
  -H 'Origin: https://web.taji.test' https://web.taji.test/api/v1/auth/refresh/ |
  python3 -c 'import json,sys; assert json.load(sys.stdin)["message"] == "Sesión renovada."'
curl -fsS --resolve web.taji.test:443:127.0.0.1 -b "$WORK/cookies" \
  https://web.taji.test/api/v1/auth/me/ |
  python3 -c 'import json,sys; assert json.load(sys.stdin)["user"]["email"] == "admin@sprint1.taji.test"'
printf 'Successful update\n' >"$WORK/source/deploy-ci.txt"
git -C "$WORK/source" add deploy-ci.txt
git -C "$WORK/source" commit -m 'Exercise web update'
taji-web-deploy update
SECOND=$(readlink -f /opt/taji-web/current)
[[ $SECOND != "$FIRST" ]]
# A broken Angular build must never replace the healthy release.
printf '\nthis is intentionally invalid TypeScript\n' >>"$WORK/source/src/main.ts"
git -C "$WORK/source" add src/main.ts
git -C "$WORK/source" commit -m 'Exercise failed build'
set +e
taji-web-deploy update
RESULT=$?
set -e
[[ $RESULT != 0 && $(readlink -f /opt/taji-web/current) == "$SECOND" ]]
git -C "$WORK/source" revert --no-edit HEAD
# A health failure after switching must restore the previous release and Nginx.
cat >"$WORK/bin/curl" <<'CURL'
#!/usr/bin/env bash
if [[ ${TAJI_CI_HTTP_FAILURE:-} == 1 ]]; then exit 22; fi
exec /usr/bin/curl "$@"
CURL
chmod 0755 "$WORK/bin/curl"
set +e
TAJI_CI_HTTP_FAILURE=1 taji-web-deploy update
RESULT=$?
set -e
[[ $RESULT != 0 && $(readlink -f /opt/taji-web/current) == "$SECOND" ]]
taji-web-deploy update
[[ $(readlink -f /opt/taji-web/current) != "$SECOND" ]]
curl -fsS --resolve web.taji.test:443:127.0.0.1 https://web.taji.test/residentes-unidades >/dev/null
echo 'PASS: install, proxy/auth, no-op, update, failed build, rollback and recovery.'
