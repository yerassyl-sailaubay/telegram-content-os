#!/usr/bin/env bash

set -euo pipefail

load_env_file() {
  local file="$1"
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines.
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" != *=* ]] && continue

    local key="${line%%=*}"
    local value="${line#*=}"

    # Trim whitespace around key.
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"

    # Trim matching surrounding quotes in value.
    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "$key=$value"
  done <"$file"
}

if [ -f .env.e2e ]; then
  load_env_file .env.e2e
fi

required_vars=(E2E_BASE_URL E2E_EMAIL E2E_PASSWORD)
for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required env var: ${var_name}" >&2
    echo "Set it in your shell or .env.e2e (see docs/testing-agent.env.example)." >&2
    exit 1
  fi
done

if [ "${E2E_INSTALL_BROWSER:-1}" = "1" ]; then
  bunx playwright install chromium
fi

bunx playwright test --config=playwright.agent.config.ts "$@"
