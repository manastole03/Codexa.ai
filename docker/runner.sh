#!/usr/bin/env sh
set -eu

CODE_FILE="${CODE_FILE:-/work/main.js}"
RUN_COMMAND="${RUN_COMMAND:-node /work/main.js}"
INPUT_FILE="${INPUT_FILE:-/work/input.txt}"

cd /work
test -f "$CODE_FILE"
test -f "$INPUT_FILE"
sh -lc "$RUN_COMMAND < $INPUT_FILE"
