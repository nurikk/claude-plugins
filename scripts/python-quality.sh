#!/bin/bash
# Python Quality Hook - runs ty (typecheck) and ruff (lint/format) on Python files

set -euo pipefail

# Unset UV_ENV_FILE to prevent uvx from requiring a .env file
unset UV_ENV_FILE

# Read hook input from stdin
input_data=$(cat)

# Extract file path from tool input
file_path=$(echo "$input_data" | jq -r '.tool_input.file_path // .tool_input.filePath // empty')

# Exit early if no file path or not a Python file
if [[ -z "$file_path" ]] || [[ ! "$file_path" =~ \.py$ ]]; then
    exit 0
fi

# Exit if file doesn't exist (might have been deleted)
if [[ ! -f "$file_path" ]]; then
    exit 0
fi

# Get the directory containing the file for running checks
file_dir=$(dirname "$file_path")

# Track issues found
issues_found=""

# Run ruff format (auto-fix formatting)
if command -v uvx &> /dev/null; then
    echo "Formatting ${file_path}..."
    if ! uvx ruff format "$file_path" 2>&1; then
        issues_found="${issues_found}Formatting failed. "
    fi

    # Run ruff check with auto-fix for safe fixes
    echo "Linting ${file_path}..."
    ruff_output=$(uvx ruff check --fix "$file_path" 2>&1) || true
    if [[ -n "$ruff_output" ]] && [[ "$ruff_output" != *"All checks passed"* ]]; then
        echo "$ruff_output"
        issues_found="${issues_found}Lint issues found. "
    fi

    # Run ty type checker
    echo "Type checking ${file_path}..."
    ty_output=$(uvx ty check "$file_path" 2>&1) || true
    if [[ -n "$ty_output" ]] && [[ "$ty_output" != *"0 errors"* ]] && [[ "$ty_output" != *"All checks passed"* ]]; then
        echo "$ty_output"
        issues_found="${issues_found}Type errors found. "
    fi
else
    echo "Warning: uvx not found. Install uv to enable Python quality checks." >&2
    exit 0
fi

# Output result as JSON for Claude to see
if [[ -n "$issues_found" ]]; then
    cat << EOF
{
  "continue": true,
  "systemMessage": "Python quality checks completed with issues: ${issues_found}Review the output above."
}
EOF
else
    cat << EOF
{
  "continue": true,
  "suppressOutput": true
}
EOF
fi

exit 0
