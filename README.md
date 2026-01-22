# Claude Plugins

A collection of Claude Code plugins.

## Quick Start

```
/plugin marketplace add nurikk/claude-plugins
```

> **Note:** The GitHub repo is `nurikk/claude-plugins`, but the marketplace identifier is `nurikk-plugins` (used when installing plugins).

## Available Plugins

| Plugin | Description | Install |
|--------|-------------|---------|
| [python-quality](#python-quality) | Python formatting, linting & type checking with ruff and ty | `/plugin install python-quality@nurikk-plugins` |

---

## python-quality

Automatically runs Python quality checks after file changes.

### What It Does

When Claude writes or edits a `.py` file, this plugin automatically runs:

| Tool | Command | Purpose |
|------|---------|---------|
| **ruff format** | `uvx ruff format` | Auto-formats code (PEP 8 style) |
| **ruff check** | `uvx ruff check --fix` | Lints and auto-fixes safe issues |
| **ty** | `uvx ty check` | Type checks using Astral's fast type checker |

### Requirements

- [uv](https://github.com/astral-sh/uv) - Fast Python package installer
- `jq` - JSON processor (pre-installed on most systems)

Install uv:
```bash
# macOS
brew install uv

# Linux/macOS (curl)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installation

```
/plugin marketplace add nurikk/claude-plugins
/plugin install python-quality@nurikk-plugins
```

Or add directly to your `~/.claude/settings.json`:

```json
{
  "enabledPlugins": {
    "python-quality@nurikk-plugins": true
  }
}
```

### Behavior

#### Auto-formatting

The plugin auto-formats Python files using ruff, which handles:
- Import sorting
- Line length enforcement
- Consistent spacing
- Quote style normalization

#### Auto-fixing

Safe lint fixes are applied automatically:
- Removing unused imports
- Fixing simple style issues
- Correcting obvious errors

#### Type Checking

Type errors are reported but don't block the operation. You'll see output like:

```
error[invalid-return-type]: Return type does not match returned value
 --> example.py:3:25
  |
3 | def greet(name: str) -> int:
  |                         --- Expected `int` because of return type
4 |     return "hello"
  |            ^^^^^^^ expected `int`, found `str`
```

### Troubleshooting

#### Hook not running

1. Restart Claude Code after installing the plugin
2. Check hooks are registered: `/hooks`
3. Verify plugin is enabled in settings

#### UV_ENV_FILE error

If you see `error: No environment file found at: .env`, the script handles this by unsetting `UV_ENV_FILE`. If issues persist, check your shell profile for this variable.

#### Tools not found

Ensure `uvx` is in your PATH:
```bash
which uvx
```

### Tools Used

- **[ruff](https://github.com/astral-sh/ruff)** - Extremely fast Python linter and formatter
- **[ty](https://github.com/astral-sh/ty)** - Fast Python type checker from Astral

Both tools are run via `uvx` (uv's tool runner), so they don't need to be pre-installed.

---

## Repository Structure

```
claude-plugins/
├── .claude-plugin/
│   └── marketplace.json      # Marketplace catalog
├── plugins/
│   └── python-quality/       # Python quality plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── hooks/
│       │   └── hooks.json
│       └── scripts/
│           └── python-quality.sh
├── README.md
└── LICENSE
```

## License

MIT
