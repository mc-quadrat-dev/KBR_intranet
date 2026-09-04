#!/bin/bash
# ---------------------------------------------------------------------
# Baut testmotive.js aus den Bildern im Ordner „Beispiele“.
#
# Warum eingebettet und nicht als Dateipfad: Beim Öffnen per Doppelklick
# (file://) behandelt der Browser jede Datei als eigene Herkunft. Ein extern
# geladenes Bild würde das Canvas sperren – JPG-, PSD- und SVG-Export brächen
# dann mit einem Sicherheitsfehler ab. Data-URLs sperren nichts.
#
# Aufruf:  bash testmotive-bauen.sh
# ---------------------------------------------------------------------
set -e
cd "$(dirname "$0")"

MAX_PX=1000        # längste Kante; darüber wird verkleinert
QUALITAET=50       # JPEG-Qualität – Testmotive müssen nicht druckfein sein
QUELLE="Beispiele"
ZIEL="testmotive.js"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

shopt -s nullglob nocaseglob
DATEIEN=("$QUELLE"/*.jpg "$QUELLE"/*.jpeg "$QUELLE"/*.png)
if [ ${#DATEIEN[@]} -eq 0 ]; then
  echo "Keine Bilder in $QUELLE gefunden." >&2; exit 1
fi

{
  echo "// ====================================================================="
  echo "// TESTMOTIVE – erzeugt von testmotive-bauen.sh, nicht von Hand ändern."
  echo "//"
  echo "// Die Bilder aus dem Ordner „$QUELLE“, auf $MAX_PX px / Qualität $QUALITAET"
  echo "// heruntergerechnet und als Data-URL eingebettet. Eingebettet deshalb,"
  echo "// weil ein per Dateipfad geladenes Bild beim Öffnen über file:// das"
  echo "// Canvas sperren und damit JPG-, PSD- und SVG-Export blockieren würde."
  echo "//"
  echo "// Bilder in „$QUELLE“ austauschen und  bash testmotive-bauen.sh  erneut"
  echo "// aufrufen, dann steht hier die neue Auswahl."
  echo "// ====================================================================="
  echo "const ITK_TESTMOTIVE = ["
} > "$ZIEL"

anzahl=0
for f in "${DATEIEN[@]}"; do
  name="$(basename "$f")"; name="${name%.*}"
  sips -Z "$MAX_PX" -s format jpeg -s formatOptions "$QUALITAET" \
       "$f" --out "$TMP/bild.jpg" >/dev/null 2>&1 || continue
  [ -s "$TMP/bild.jpg" ] || continue
  b64="$(base64 -i "$TMP/bild.jpg" | tr -d '\n')"
  printf '  { name: %s, src: %s },\n' \
         "'${name//\'/}'" "'data:image/jpeg;base64,$b64'" >> "$ZIEL"
  anzahl=$((anzahl+1))
  printf "  %-28s %6s KB\n" "$name" "$(( ${#b64} / 1024 ))"
done

echo "];" >> "$ZIEL"
echo "$anzahl Motive -> $ZIEL ($(( $(wc -c < "$ZIEL") / 1024 )) KB)"
