#!/usr/bin/env bash
# setup-asdf.sh — Install asdf, the nodejs plugin, and the pnpm plugin,
# then install the exact versions declared in .tool-versions.
#
# Usage:
#   bash scripts/setup-asdf.sh
#
# Prerequisites: git, curl (or wget)

set -euo pipefail

ASDF_DIR="${ASDF_DIR:-$HOME/.asdf}"

# ── 1. Install asdf if it is not already present ─────────────────────────────
if [ ! -d "$ASDF_DIR" ]; then
  echo "Installing asdf..."
  git clone https://github.com/asdf-vm/asdf.git "$ASDF_DIR" --branch v0.14.1
else
  echo "asdf already installed at $ASDF_DIR"
fi

# ── 2. Source asdf so the rest of the script can use it ──────────────────────
# shellcheck source=/dev/null
source "$ASDF_DIR/asdf.sh"

# ── 3. Add the nodejs plugin ─────────────────────────────────────────────────
if asdf plugin list | grep -q "^nodejs$"; then
  echo "asdf nodejs plugin already installed"
else
  echo "Adding asdf nodejs plugin..."
  asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
fi

# ── 4. Add the pnpm plugin (jonathanmorley/asdf-pnpm) ────────────────────────
if asdf plugin list | grep -q "^pnpm$"; then
  echo "asdf pnpm plugin already installed"
else
  echo "Adding asdf pnpm plugin..."
  asdf plugin add pnpm https://github.com/jonathanmorley/asdf-pnpm.git
fi

# ── 5. Install the versions declared in .tool-versions ───────────────────────
echo "Installing tool versions from .tool-versions..."
asdf install

# ── 6. Remind the user to configure their shell ──────────────────────────────
cat <<'EOF'

Setup complete!

To activate asdf in your current shell, add the following to your shell
configuration file (e.g. ~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish)
and then restart your shell or run the source command manually:

  Bash / Zsh:
    source "$HOME/.asdf/asdf.sh"
    source "$HOME/.asdf/completions/asdf.bash"   # optional completions

  Fish:
    source "$HOME/.asdf/asdf.fish"

After activating asdf, install project dependencies with:
  pnpm install

EOF
