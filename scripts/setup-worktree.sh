#!/bin/sh
# Prepares a T3 Code worktree: installs dependencies and links the main
# checkout's local env file. T3 runs it from t3.json when it creates a worktree;
# rerun it from the thread's "Actions" menu to repair one.
set -eu

if [ -z "${T3CODE_PROJECT_ROOT:-}" ]; then
  echo "T3CODE_PROJECT_ROOT is unset: run this from T3 Code's Actions menu." >&2
  exit 1
fi

npm ci --prefer-offline
# Explicitly, since npm skips lifecycle scripts under ignore-scripts.
npm run prepare

root=$(cd "$T3CODE_PROJECT_ROOT" && pwd -P)
here=$(pwd -P)
if [ "$root" = "$here" ]; then
  exit 0
fi

for file in .env.local; do
  if [ -e "$root/$file" ]; then
    ln -sfn "$root/$file" "$file"
    echo "Linked $file"
  fi
done
