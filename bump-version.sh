#!/bin/sh
# Hängt an alle lokalen JS/CSS-Einbindungen eine neue Versionsnummer (?v=...), damit Browser nach einem Update
# sofort die neuen Dateien laden statt veraltete aus dem Cache. Vor jedem Commit/Push ausführen.
cd "$(dirname "$0")"
V=$(date +%Y%m%d%H%M%S)
for f in host.html play.html remote.html tablet/index.html; do
  sed -E -i '' "s#(src|href)=\"((vendor/)?[A-Za-z0-9_.-]+\.(js|css))(\?v=[0-9]+)?\"#\1=\"\2?v=$V\"#g" "$f"
done
echo "Version $V"
