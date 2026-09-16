// =====================================================================
// INTRANET KACHEL GENERATOR – KBR
// Bild hochladen, mit Kacheln, weißen Konturen, Icon und/oder Swoosh
// versehen, live in allen Intranet-Ausspielformaten prüfen, als JPG
// exportieren.
//
// Architektur wie zuvor: ein Master-Canvas (1180×623) wird bearbeitet,
// alle Formate sind Center-Crops daraus und aktualisieren sich bei jedem
// Redraw mit. Neu gegenüber der Vorgängerversion:
//   · Verlaufshintergründe -> Kachelbereiche mit 1–5 Unterkacheln
//   · Swoosh als drittes Gestaltungselement (auf Bild / in Kachel / Maske)
//   · Farbregelwerk der Marke wird im Farbdialog erzwungen
//   · Entscheidungsbaum-UI, Vorlagen, mehrere Motive, Tutorial
//
// Alle sichtbaren Texte stehen NICHT hier, sondern in texte.js (ITK_TEXT) –
// wird dort etwas umformuliert, muss diese Datei nicht angefasst werden.
// =====================================================================

if (typeof ITK_TEXT === 'undefined') {
  // Ohne Texte kann das Werkzeug nicht sinnvoll starten – lieber laut
  // scheitern als mit lauter "undefined" in der Oberfläche.
  document.body.insertAdjacentHTML('afterbegin',
    '<div style="background:#c0002a;color:#fff;padding:14px 18px;' +
    'font:14px/1.5 -apple-system,sans-serif;position:fixed;inset:0 0 auto 0;z-index:9999">' +
    'texte.js konnte nicht geladen werden – das Werkzeug kann so nicht starten. ' +
    'Bitte prüfen, ob die Datei mit hochgeladen bzw. eingebunden wurde.</div>');
  throw new Error('texte.js fehlt – ITK_TEXT ist nicht definiert');
}

/* Einfache Platzhalter-Ersetzung für Texte aus texte.js: „Vorlage „{{name}}“
   gesichert“ + {name:'Foo'} -> „Vorlage „Foo“ gesichert“. Bewusst ohne
   Bibliothek – ein regulärer Ausdruck reicht für das, was hier vorkommt. */
function itkT(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? vars[k] : ''));
}

/* Überträgt alle Texte aus texte.js in die statische Seite: [data-t] setzt
   textContent, [data-t-html] innerHTML (für Textstellen mit <b>), [data-t-
   title] das title-Attribut (inklusive aria-label, falls vorhanden), [data-
   t-placeholder] das placeholder-Attribut. Damit bleibt index.html lesbar,
   ohne dass jede Formulierung doppelt (dort und in texte.js) gepflegt wird –
   wird einmal aufgerufen, bevor sonst irgendetwas an der Seite hängt. */
function itkApplyStaticTexts() {
  const get = path => path.split('.').reduce((o, k) => (o == null ? o : o[k]), ITK_TEXT);
  document.querySelectorAll('[data-t]').forEach(el => {
    const v = get(el.dataset.t);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-t-html]').forEach(el => {
    const v = get(el.dataset.tHtml);
    if (typeof v === 'string') el.innerHTML = v;
  });
  document.querySelectorAll('[data-t-title]').forEach(el => {
    const v = get(el.dataset.tTitle);
    if (typeof v === 'string') {
      el.title = v;
      if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', v);
    }
  });
  document.querySelectorAll('[data-t-placeholder]').forEach(el => {
    const v = get(el.dataset.tPlaceholder);
    if (typeof v === 'string') el.placeholder = v;
  });
}

const ITK_W = 1180, ITK_H = 623;

// Weiße Kontur zwischen allen Flächen. Eine einzige Konstante – die Konturen
// sind laut Vorgabe überall gleich dick und nicht editierbar.
const ITK_GAP = 14;

// ---------------------------------------------------------------------
// 1. MARKENFARBEN + REGELWERK
// Auf einer Primärfarbe dürfen nur bestimmte Sekundärfarben stehen. Das
// ist keine Empfehlung, sondern wird im Farbdialog hart durchgesetzt.
// ---------------------------------------------------------------------
const KBR = {
  navy:       '#00114A',
  magenta:    '#E20074',
  forest:     '#0A5544',
  lightblue:  '#C8F5FF',
  lightgreen: '#DCF59B',
  white:      '#FFFFFF'
};
const KBR_PRIMARIES  = [KBR.magenta, KBR.navy, KBR.forest];
const KBR_NAMES = {
  [KBR.navy]: ITK_TEXT.farben.navy, [KBR.magenta]: ITK_TEXT.farben.magenta,
  [KBR.forest]: ITK_TEXT.farben.forest, [KBR.lightblue]: ITK_TEXT.farben.hellblau,
  [KBR.lightgreen]: ITK_TEXT.farben.hellgruen, [KBR.white]: ITK_TEXT.farben.weiss
};
/* Welche Sekundärfarben dürfen auf welcher Primärfarbe stehen? */
const KBR_ON = {
  [KBR.navy]:    [KBR.lightblue],
  [KBR.forest]:  [KBR.lightgreen],
  [KBR.magenta]: [KBR.lightgreen, KBR.white]
};
/* Swoosh direkt auf dem Foto: freie Wahl zwischen den beiden Hellfarben. */
const KBR_SWOOSH_ON_PHOTO = [KBR.lightgreen, KBR.lightblue];

function kbrAllowedOn(primary) { return KBR_ON[primary] || KBR_SWOOSH_ON_PHOTO; }

/* Schrift folgt denselben Regeln – mit einer Ausnahme: Auf Magenta steht sie
   immer weiß, obwohl dort auch Hellgrün erlaubt wäre. */
function kbrTextOn(primary) {
  return primary === KBR.magenta ? [KBR.white] : kbrAllowedOn(primary);
}
function kbrFix(color, allowed) { return allowed.includes(color) ? color : allowed[0]; }

// ---------------------------------------------------------------------
// 2. SWOOSH
// Beide gelieferten SVGs teilen denselben Pfad, nur die Füllung
// unterscheidet sie – deshalb hier einmal der Pfad, Farbe kommt aus dem
// Regelwerk.  Original-viewBox: 0 0 1000 903.67
// ---------------------------------------------------------------------
const ITK_SWOOSH_VB = { w: 1000, h: 903.67 };
const ITK_SWOOSH_D = 'M263.61,903.67c-30.99,0-58.94-21.41-65.98-52.92-8.16-36.48,14.79-72.66,51.27-80.82l240.49-53.8c-23.9-4.89-44.39-8.61-59.02-10.46-71.35-8.96-285.56-9.13-362.08-8.43-.2,0-.41,0-.62,0-32.82,0-60.96-23.58-66.65-55.96-5.73-32.59,12.95-64.54,44.16-75.54l324.26-114.29-187.44,16.52c-34.62,3.05-65.97-20.66-72.44-54.85-6.46-34.18,14.05-67.7,47.42-77.5,1.72-.51,174.27-51.49,351.15-127.6C685.29,131.8,896.37,10.29,898.48,9.07c32.38-18.68,73.76-7.58,92.45,24.79,18.68,32.37,7.59,73.76-24.78,92.44-7.43,4.29-156.07,89.87-312.44,164.22l238.24-20.99c33.98-2.97,64.86,19.76,72.08,53.09,7.22,33.33-11.48,66.82-43.65,78.16l-481.32,169.66c2.88.31,5.62.62,8.23.95,92.34,11.68,348.28,78.71,359.13,81.56,30.2,7.93,51.06,35.48,50.49,66.7-.57,31.22-22.42,57.99-52.89,64.81l-525.57,117.57c-4.97,1.11-9.95,1.65-14.84,1.65Z';
const ITK_SWOOSH_PATH = new Path2D(ITK_SWOOSH_D);

// ---------------------------------------------------------------------
// 3. FORMATE (Unily-Intranet-Ausspielformate) – unverändert übernommen
// ---------------------------------------------------------------------
const ITK_FORMATS = [
  { name: 'Story Page',             w: 1108, h: 623, scale: 0.35, group: 'main' },
  { name: 'Large Rectangle',        w: 720,  h: 576, scale: 0.25, group: 'main' },
  { name: 'Small Rectangle',        w: 360,  h: 288, scale: 0.35, group: 'main' },

  { name: 'News Panorama Large',    w: 1140, h: 431, scale: 0.35, group: 'more' },
  { name: 'Smart Feed Big',         w: 930,  h: 440, scale: 0.30, group: 'more' },
  { name: 'Widget Main',            w: 755,  h: 424, scale: 0.35, group: 'more' },
  { name: 'Rectangle',              w: 720,  h: 360, scale: 0.28, group: 'more' },
  { name: 'Panorama',               w: 600,  h: 400, scale: 0.35, group: 'more' },
  { name: 'Smart Feed Medium',      w: 570,  h: 357, scale: 0.40, group: 'more' },
  { name: 'Portrait Rectangle',     w: 460,  h: 542, scale: 0.32, group: 'more' },
  { name: 'Small Panorama',         w: 450,  h: 180, scale: 0.42, group: 'more' },
  { name: 'Card Image',             w: 360,  h: 180, scale: 0.40, group: 'more' },
  { name: 'Microsite',              w: 308,  h: 220, scale: 0.48, group: 'more' },
  { name: 'News Grid Small',        w: 285,  h: 285, scale: 0.40, group: 'more' },
  { name: 'Smart Feed Small',       w: 187,  h: 119, scale: 0.65, group: 'more' }
];
function itkFormatByName(name) { return ITK_FORMATS.find(f => f.name === name); }

// ---------------------------------------------------------------------
// 3b. WIDGET-MATRIX – unverändert übernommen
// ---------------------------------------------------------------------
const ITK_WIDGETS = [
  { key: 'smart-feed', label: ITK_TEXT.widgets['smart-feed'], rows: [
    { grid: '100', slots: [
      { format: 'Smart Feed Big',    overlay: 'smartFeedBig' },
      { format: 'Smart Feed Medium', overlay: 'smartFeedMedium' },
      { format: 'Smart Feed Small',  overlay: 'smartFeedSmall' },
      { format: 'Card Image',        overlay: 'none', note: ITK_TEXT.widgetNotizen.mobile },
      { format: 'Small Rectangle',   overlay: 'none', note: ITK_TEXT.widgetNotizen.mobile }
    ] }
  ] },
  { key: 'story-banner', label: ITK_TEXT.widgets['story-banner'], rows: [
    { grid: '100', slots: [
      { format: 'News Panorama Large', overlay: 'bottomHeadline' },
      { format: 'Microsite',           overlay: 'microsite', note: ITK_TEXT.widgetNotizen.mobile }
    ] },
    { grid: '66/33', slots: [
      { format: 'Widget Main', overlay: 'bannerTop' },
      { format: 'Panorama',    overlay: 'bannerTopPlain', note: ITK_TEXT.widgetNotizen.tablet }
    ] },
    { grid: '75/25', slots: [ { format: 'Rectangle', overlay: 'bannerTop' } ] }
  ] },
  { key: 'top-news', label: ITK_TEXT.widgets['top-news'], rows: [
    { grid: '100',   slots: [ { format: 'News Panorama Large', overlay: 'bottomHeadline' } ] },
    { grid: '50/50', slots: [ { format: 'Large Rectangle', overlay: 'bottomHeadline' } ] },
    { grid: '66/33', slots: [
      { format: 'Story Page',         overlay: 'bottomHeadline' },
      { format: 'Portrait Rectangle', overlay: 'bottomHeadline' }
    ] },
    { grid: '75/25', slots: [ { format: 'Rectangle', overlay: 'bottomHeadline' } ] }
  ] },
  { key: 'news-rollup', label: ITK_TEXT.widgets['news-rollup'], rows: [
    { grid: '50/50', slots: [ { format: 'News Grid Small', overlay: 'none' } ] },
    { grid: '66/33', slots: [ { format: 'News Grid Small', overlay: 'none' } ] }
  ] },
  /* Story Carousel und News Carousel spielen dieselben Formate mit derselben
     Überlagerung aus – zwei Einträge wären hier nur doppelte Arbeit. */
  { key: 'story-news-carousel', label: ITK_TEXT.widgets['story-news-carousel'], rows: [
    { grid: '100',   slots: [ { format: 'Large Rectangle', overlay: 'tagsTop' } ] },
    { grid: '66/33', slots: [
      { format: 'Large Rectangle', overlay: 'tagsTop' },
      { format: 'Small Rectangle', overlay: 'tagsTop' } ] },
    { grid: '75/25', slots: [
      { format: 'Large Rectangle', overlay: 'tagsTop' },
      { format: 'Small Rectangle', overlay: 'tagsTop' } ] }
  ] },
  { key: 'story-cards', label: ITK_TEXT.widgets['story-cards'], rows: [
    { grid: '100', slots: [
      { format: 'Large Rectangle', overlay: 'storyCard' },
      { format: 'Large Rectangle', overlay: 'none', note: ITK_TEXT.widgetNotizen.mobile },
      { format: 'Small Panorama',  overlay: 'none', note: ITK_TEXT.widgetNotizen.mobile }
    ] }
  ] }
];

// ---------------------------------------------------------------------
// 4. KACHELBEREICHE
// „split“ beschreibt, wo die Trennlinie zwischen Foto und Kachelfläche
// liegt. Ohne Icon stehen sechs Bereiche zur Wahl; mit Icon nur die drei
// mittig geteilten – ein Icon sitzt immer in der Mitte des Layouts und
// dürfte sonst über einer Kachelkante hängen, die nicht dort verläuft.
// ---------------------------------------------------------------------
const ITK_AREAS = [
  { id: 'none', label: ITK_TEXT.bereiche.none, icon: 'both', min: 0, split: null },

  { id: 'bottom-s', label: ITK_TEXT.bereiche['bottom-s'],  icon: false, min: 1, split: { type: 'bottom', y: 0.74 } },
  { id: 'bottom-l', label: ITK_TEXT.bereiche['bottom-l'],  icon: false, min: 1, split: { type: 'bottom', y: 0.56 } },
  { id: 'right',    label: ITK_TEXT.bereiche.right,        icon: false, min: 1, split: { type: 'right',  x: 0.63 } },
  { id: 'left',     label: ITK_TEXT.bereiche.left,         icon: false, min: 1, split: { type: 'left',   x: 0.37 } },
  { id: 'l-right',  label: ITK_TEXT.bereiche['l-right'],   icon: false, min: 2, split: { type: 'l-right', x: 0.66, y: 0.70 } },
  { id: 'l-left',   label: ITK_TEXT.bereiche['l-left'],    icon: false, min: 2, split: { type: 'l-left',  x: 0.34, y: 0.70 } },

  { id: 'icon-left',   label: ITK_TEXT.bereiche['icon-left'],   icon: true, min: 1, split: { type: 'left',   x: 0.50 } },
  { id: 'icon-right',  label: ITK_TEXT.bereiche['icon-right'],  icon: true, min: 1, split: { type: 'right',  x: 0.50 } },
  { id: 'icon-bottom', label: ITK_TEXT.bereiche['icon-bottom'], icon: true, min: 1, split: { type: 'bottom', y: 0.50 } },

  /* Ohne Foto: die ganze Fläche wird in Kacheln geteilt. Erreichbar nur über
     den Knopf „Kein Bild“ im Reiter Bild, deshalb aus der Auswahl versteckt –
     im Bereichsraster hätte er keine sinnvolle Vorschau. */
  { id: 'full', label: ITK_TEXT.bereiche.full, icon: 'both', min: 1, versteckt: true,
    split: { type: 'full' } }
];
function itkArea(id) { return ITK_AREAS.find(a => a.id === id); }
function itkAreasFor(d) {
  // Mit Text stehen nur die beiden unteren Bereiche zur Wahl – und sobald der
  // Text zweizeilig wird, bleibt nur der hohe übrig.
  if (itkMtOn(d)) {
    const ids = itkMtLines(d) > 1 ? ['bottom-l'] : ['bottom-s', 'bottom-l'];
    return ITK_AREAS.filter(a => ids.includes(a.id));
  }
  const hasIcon = d.iconKey !== 'none';
  return ITK_AREAS.filter(a => !a.versteckt && (a.icon === 'both' || a.icon === hasIcon));
}

/* Zweizeilig verlangt den hohen Kachelbereich. Gibt true zurück, wenn dafür
   umgestellt werden musste. */
function itkMtEnforceArea(m) {
  const d = m.design;
  if (!itkMtOn(d)) return false;
  // Der Kachelbereich ist mit Text kein Auswahl-, sondern ein Ergebnisfeld:
  // eine Zeile läuft schmal, zwei Zeilen laufen breit – automatisch, in
  // beide Richtungen, sobald sich die Zeilenzahl beim Tippen ändert.
  const ziel = itkMtLines(d) > 1 ? 'bottom-l' : 'bottom-s';
  if (d.areaId !== ziel) { itkApplyArea(m, ziel); return true; }
  return false;
}
/* Kachelmodus ohne Foto – dort und nur dort dürfen Bilder in einzelne
   Kacheln gelegt werden. */
function itkIsFullTiles(d) { return d.areaId === 'full'; }

/* Wie viele der Kacheln dürfen gleichzeitig ein eigenes Bild zeigen? Bei
   wenigen Kacheln bliebe von der Fläche sonst kaum noch etwas Eigenes übrig. */
function itkMaxTileImages(n) { return n <= 3 ? 1 : 2; }

/* Nach jeder Neuaufteilung zählen: Passt die Kachelanzahl nicht mehr zur
   Anzahl eingesetzter Bilder (z. B. nach dem Verkleinern des Reglers),
   verlieren die überzähligen ihr Bild – die ersten behalten Vorrang. */
function itkEnforceTileImageLimit(d) {
  if (!itkIsFullTiles(d)) return;
  const max = itkMaxTileImages(d.tiles.length);
  let used = 0;
  d.tiles.forEach(t => {
    if (!t.src) return;
    used++;
    if (used > max) t.src = null;
  });
}

/* Zurück aus dem Kachelmodus in ein Fotolayout. Der Bereich, der vor dem
   Umschalten galt, kommt wieder – sonst der Standard. Ohne diesen Rückweg
   wäre „Kein Bild“ eine Sackgasse: ein hochgeladenes Foto läge unsichtbar
   unter der vollflächigen Kachelfläche. */
function itkLeaveFullTiles(m) {
  const d = m.design;
  if (!itkIsFullTiles(d)) return;
  const zurueck = d.areaBeforeFull || 'bottom-s';
  d.areaBeforeFull = null;
  itkApplyArea(m, zurueck);
}

/* Foto-Restfläche und Startrechtecke der Kachelfläche. Die halbe Kontur
   wird auf beiden Seiten der Trennlinie abgezogen, damit die weiße Fuge
   überall exakt ITK_GAP breit ist – auch zwischen Foto und Kachel. */
function itkRegions(split, W, H, gap) {
  const g = gap / 2;
  if (!split) return { photo: { x: 0, y: 0, w: W, h: H }, seeds: [] };
  // Ganze Fläche: kein Foto darunter, alles ist Kachelbereich.
  if (split.type === 'full') return { photo: { x: 0, y: 0, w: 0, h: 0 },
                                      seeds: [ { x: 0, y: 0, w: W, h: H } ] };
  if (split.type === 'bottom') {
    const y = split.y * H;
    return { photo: { x: 0, y: 0, w: W, h: y - g },
             seeds: [ { x: 0, y: y + g, w: W, h: H - y - g } ] };
  }
  if (split.type === 'right') {
    const x = split.x * W;
    return { photo: { x: 0, y: 0, w: x - g, h: H },
             seeds: [ { x: x + g, y: 0, w: W - x - g, h: H } ] };
  }
  if (split.type === 'left') {
    const x = split.x * W;
    return { photo: { x: x + g, y: 0, w: W - x - g, h: H },
             seeds: [ { x: 0, y: 0, w: x - g, h: H } ] };
  }
  if (split.type === 'l-right') {
    const x = split.x * W, y = split.y * H;
    return { photo: { x: 0, y: 0, w: x - g, h: y - g },
             seeds: [ { x: x + g, y: 0, w: W - x - g, h: y - g },
                      { x: 0, y: y + g, w: W, h: H - y - g } ] };
  }
  if (split.type === 'l-left') {
    const x = split.x * W, y = split.y * H;
    return { photo: { x: x + g, y: 0, w: W - x - g, h: y - g },
             seeds: [ { x: 0, y: 0, w: x - g, h: y - g },
                      { x: 0, y: y + g, w: W, h: H - y - g } ] };
  }
  return { photo: { x: 0, y: 0, w: W, h: H }, seeds: [] };
}

// ---------------------------------------------------------------------
// 5. ICONS – 5 mitgelieferte + eigener Upload
// ---------------------------------------------------------------------
/* KBR-Logo als Icon-Variante: liegt wie ein Icon auf einer Trägerfläche,
   ist aber breit statt quadratisch und immer weiß auf Magenta.
   Quelle: RGB_Primäres_Logo_Weiß.svg, Formen auf #000000 normiert. */
const ITK_LOGO_SVG = '<svg viewBox="0 0 989.23 209.02" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M41.05,137.09H0v-41.05h40.98v41.05h.07ZM0,1.64v69.79h12.31v-2.03c0-32.86,18.46-53.35,53.36-53.35h2.02v147.74c0,20.48-8.18,28.74-28.74,28.74h-6.15v14.33h106.71v-14.33h-6.15c-20.49,0-28.74-8.18-28.74-28.74V15.98h2.03c34.89,0,53.35,20.48,53.35,53.35v2.03h12.31V1.64H0ZM131.32,137.09h41.05v-41.05h-40.98l-.07,41.05Z"/><path fill="#000000" d="M947.87,133.46v73.39h18.25v-73.39h23.11v-16.9h-64.46v16.9h23.11ZM893.13,142.92h.81l9.73,29.47h-20.14l9.6-29.47ZM933.51,206.85l-30.78-90.28h-18.24l-30.83,90.29h18.52l5.82-17.56h31.23l5.81,17.56h18.48ZM813.22,133.46c6.04-.53,11.36,3.93,11.89,9.97.05.59.05,1.19,0,1.79,0,7.57-4.86,11.63-11.9,11.63h-14.32v-23.38h14.32ZM825.93,171.98c10.94-3.65,18.12-12.98,18.12-26.76,0-18.25-12.44-28.66-30.02-28.66h-33.38v90.3h18.25v-32.99h8.79l17.03,32.98h20.28l-19.06-34.87h0ZM738.91,209.02c16.9,0,30.28-10.28,30.28-28.39,0-13.1-8.24-23.11-21.76-26.62l-10.41-2.84c-5.01-1.35-9.19-3.64-9.19-9.72s4.72-9.87,10.94-9.87c7.03,0,10.94,3.38,12.04,10.13h17.83c-1.76-16.62-11.63-27.31-29.87-27.31-16.76,0-29.61,11.09-29.61,28.25,0,11.09,5.82,21.49,20.14,25.41l10.41,2.98c7.03,1.89,10.82,4.73,10.82,10.68s-3.92,10.13-11.63,10.13c-6.76,0-11.76-2.98-13.26-10.54h-18.24c1.62,17.84,12.84,27.71,31.49,27.71M656.46,190.77v-21.63h13.25c7.16,0,11.08,4.06,11.08,10.68.48,5.57-3.64,10.48-9.21,10.96-.62.05-1.25.05-1.87,0h-13.25ZM670.12,132.64c5.25-.22,9.69,3.87,9.9,9.12.02.43,0,.86-.03,1.29,0,6.35-3.79,10.53-9.87,10.53h-13.66v-20.95h13.66ZM687.83,161.16c7.2-4.35,11.44-12.28,11.08-20.68,0-12.98-7.84-23.92-26.36-23.92h-34.34v90.29h33.65c19.61,0,27.84-11.22,27.84-25,0-9.46-4.32-16.63-11.89-20.14v-.55h.02ZM571.59,116.56v90.29h53.13v-16.89h-34.89v-20.55h33.51v-16.9h-33.51v-19.06h34.87v-16.9h-53.1ZM558.61,116.56h-18.25v90.29h18.25v-90.29ZM494.68,133.45c6.04-.53,11.35,3.93,11.89,9.97.05.6.05,1.2,0,1.79,0,7.57-4.87,11.63-11.9,11.63h-14.33v-23.38h14.33ZM507.38,171.97c10.94-3.64,18.11-12.98,18.11-26.76,0-18.25-12.44-28.65-30.01-28.65h-33.39v90.28h18.25v-32.97h8.79l17.03,32.97h20.28l-19.06-34.87h0ZM411.55,133.45v73.39h18.25v-73.39h23.11v-16.9h-64.47v16.9h23.11ZM325.58,116.56v90.29h53.12v-16.89h-34.87v-20.55h33.51v-16.9h-33.51v-19.06h34.87v-16.9h-53.12ZM272.73,190.77v-21.63h13.25c7.16,0,11.09,4.06,11.09,10.68.48,5.57-3.65,10.48-9.22,10.96-.62.05-1.25.05-1.87,0h-13.25ZM286.39,132.64c5.25-.22,9.69,3.86,9.9,9.11.02.44,0,.86-.03,1.3,0,6.35-3.79,10.53-9.87,10.53h-13.66v-20.95h13.66ZM304.1,161.16c7.2-4.35,11.45-12.28,11.08-20.68,0-12.98-7.84-23.92-26.36-23.92h-34.33v90.29h33.65c19.6,0,27.84-11.22,27.84-25,0-9.46-4.32-16.63-11.9-20.14v-.55h.02Z"/><path fill="#000000" d="M759.42,75.06h-.82L714.43,1.64h-9.57v91.34h9.3V19.69h.81l44.17,73.29h9.57V1.64h-9.29v73.42ZM657.15,10.39c9.85,0,19.01,5.2,19.01,18.18s-9.16,18.19-19.01,18.19h-20.23V10.39h20.23ZM662.89,55.23c12.85-1.78,22.97-10.39,22.97-26.67,0-18.32-12.98-26.94-28.17-26.94h-30.08v91.34h9.3v-37.33h15.72l23.24,37.33h10.81l-23.79-37.73ZM560.48,1.64v91.34h49.77v-8.74h-40.48v-33.64h39.11v-8.74h-39.11V10.39h40.48V1.64h-49.77ZM498.27,83.41l43.9-70.69V1.64h-51.67v8.74h41.7v.82l-43.9,70.7v11.08h54.29v-8.74h-44.3v-.82h-.02ZM461.48,75.07h-.81L416.52,1.64h-9.57v91.34h9.29V19.69h.82l44.16,73.29h9.57V1.64h-9.3v73.42h-.02ZM355.93,85.46c-17.22,0-26.8-13.67-26.8-38.15s9.57-38.15,26.8-38.15,26.8,13.67,26.8,38.15-9.58,38.15-26.8,38.15M355.94,94.61c23.39,0,36.64-18.04,36.64-47.3S379.33,0,355.94,0s-36.65,18.04-36.65,47.3,13.26,47.31,36.64,47.31M303.03,92.97h11.23l-35.15-51.68L313.54,1.64h-12.3l-36.64,42.93h-.82V1.64h-9.29v91.34h9.29v-33.63l8.89-10.25h.82l29.53,43.9v-.03Z"/></svg>';

const ITK_ICONS = [
  { key: 'party', label: ITK_TEXT.icon.symbole.party, svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m16.057 25.106c-1.097.404-2.49.916-4.252 1.569-3.009-.42-6.171-1.399-7.538-3.646.498-1.341.932-2.516 1.316-3.553 2.576 2.976 7.077 4.866 10.474 5.63z"/><path d="m16.931 15.069c-2.928-2.927-6.698-5.089-8.235-3.549-.328.328-.229.132-2.508 6.317 2.43 3.507 8.57 5.956 12.847 6.171 1.279-.481 1.249-.505 1.446-.703 1.885-1.885-1.666-6.353-3.55-8.236zm2.488 7.174c-.143.145-.808.152-1.989-.431-1.284-.635-2.749-1.742-4.125-3.118-3.188-3.188-3.933-5.73-3.549-6.114.06-.06.172-.092.331-.092.861 0 3.092.951 5.784 3.642 1.376 1.376 2.484 2.841 3.119 4.125.583 1.179.573 1.845.429 1.988z"/><path d="m9.059 27.694c-1.732.644-3.729 1.39-6.048 2.259-.603.222-1.187-.364-.964-.964.584-1.564 1.111-2.978 1.591-4.268 1.318 1.514 3.3 2.432 5.421 2.973z"/><path d="m19.669 3.895c-.467.082-.918.156-1.224.31.46.706 1.421 1.605.834 2.779-.525 1.05-1.616.988-2.563 1.021.581.794 1.253 1.599.735 2.636-.537 1.075-1.945 1.298-2.776 1.433-.269.044-.519-.136-.569-.403l-.182-.982c-.051-.273.133-.536.406-.584.473-.083.916-.155 1.224-.31-.462-.701-1.419-1.609-.835-2.778.524-1.047 1.614-.988 2.563-1.021-.582-.794-1.253-1.599-.735-2.636.537-1.074 1.946-1.298 2.775-1.433.269-.044.519.136.568.403l.182.982c.053.273-.129.535-.403.583z"/><path d="m28.689 11.925.982.182c.268.05.447.3.403.568-.135.829-.359 2.238-1.433 2.775-1.037.518-1.842-.153-2.636-.735-.033.949.026 2.04-1.021 2.563-1.169.584-2.077-.373-2.778-.835-.155.308-.227.751-.31 1.224-.048.274-.311.457-.584.406l-.982-.182c-.268-.05-.447-.3-.403-.569.135-.83.359-2.238 1.433-2.776 1.036-.518 1.842.154 2.636.735.033-.947-.029-2.039 1.021-2.563 1.174-.587 2.073.374 2.779.834.154-.306.228-.757.31-1.224.047-.271.309-.453.583-.403z"/><path d="m25.7 21h-1.9c-.166 0-.3-.134-.3-.3v-.9c0-.166.134-.3.3-.3h1.9c.166 0 .3.134.3.3v.9c0 .166-.134.3-.3.3z"/><path d="m27.788 3.273-1.344 1.344c-.117.117-.307.117-.424 0l-.636-.637c-.117-.117-.117-.307 0-.424l1.344-1.344c.117-.117.307-.117.424 0l.636.636c.117.117.117.307 0 .425z"/><path d="m12.2 6.5h-.9c-.166 0-.3-.134-.3-.3v-1.9c0-.166.134-.3.3-.3h.9c.166 0 .3.134.3.3v1.9c0 .166-.134.3-.3.3z"/><path d="m19.383 13.255-.75-.5c-.141-.094-.182-.284-.085-.423 2.041-2.904 5.976-5.931 10.139-6.077.171-.005.313.137.313.307v.901c0 .16-.126.285-.286.292-3.483.138-7.051 2.761-8.928 5.424-.093.133-.269.166-.403.076z"/></svg>' },
  { key: 'aufruf', label: ITK_TEXT.icon.symbole.aufruf, svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="m15.87882 15.08708h-8.87659c-1.65125 0-3.00223 1.35104-3.00223 3.00223v14.74094c0 1.65125 1.35098 3.00223 3.00223 3.00223h8.87659z"/><path d="m49.95414 6.91102c-1.11248-.54566-2.41062-.32765-3.32247.48035-6.08708 4.97236-13.89881 7.71874-21.74616 7.69568 0 .00002-7.0052.00002-7.0052.00002v20.7454h7.00521c7.88972-.03305 15.61756 2.73346 21.79623 7.73577 1.8495 1.66611 5.06814.24231 4.98363-2.27181.00005.00012.00005-31.67339.00005-31.67339 0-1.17091-.65051-2.21167-1.71129-2.71204z"/><path d="m53.66692 17.59895v15.71169c8.44644-1.914 8.44177-13.80043 0-15.71169z"/><path d="m22.22357 37.83397h-11.68868l7.74575 17.14275c.66046 1.46111 2.12157 2.41183 3.73275 2.41183 2.60236.06921 4.68895-2.62641 3.9629-5.13387.00007.00005-3.75272-14.42071-3.75272-14.42071z"/></svg>' },
  { key: 'event', label: ITK_TEXT.icon.symbole.event, svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect height="6" rx="2" width="4" x="11" y="3"/><rect height="6" rx="2" width="4" x="33" y="3"/><path d="m4 18v23c0 2.209 1.791 4 4 4h32c2.209 0 4-1.791 4-4v-23zm12 20c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm11 11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm11 11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2z"/><path d="m44 16v-6c0-2.209-1.791-4-4-4h-1v1c0 2.206-1.794 4-4 4s-4-1.794-4-4v-1h-14v1c0 2.206-1.794 4-4 4s-4-1.794-4-4v-1h-1c-2.209 0-4 1.791-4 4v6z"/></svg>' },
  { key: 'team', label: ITK_TEXT.icon.symbole.team, svg: '<svg viewBox="0 0 511.999 511.999" xmlns="http://www.w3.org/2000/svg"><path d="M438.09,273.32h-39.596c4.036,11.05,6.241,22.975,6.241,35.404v149.65c0,5.182-0.902,10.156-2.543,14.782h65.461c24.453,0,44.346-19.894,44.346-44.346v-81.581C512,306.476,478.844,273.32,438.09,273.32z"/><path d="M107.265,308.725c0-12.43,2.205-24.354,6.241-35.404H73.91c-40.754,0-73.91,33.156-73.91,73.91v81.581c0,24.452,19.893,44.346,44.346,44.346h65.462c-1.641-4.628-2.543-9.601-2.543-14.783V308.725z"/><path d="M301.261,234.815h-90.522c-40.754,0-73.91,33.156-73.91,73.91v149.65c0,8.163,6.618,14.782,14.782,14.782h208.778c8.164,0,14.782-6.618,14.782-14.782v-149.65C375.171,267.971,342.015,234.815,301.261,234.815z"/><path d="M256,38.84c-49.012,0-88.886,39.874-88.886,88.887c0,33.245,18.349,62.28,45.447,77.524c12.853,7.23,27.671,11.362,43.439,11.362c15.768,0,30.586-4.132,43.439-11.362c27.099-15.244,45.447-44.28,45.447-77.524C344.886,78.715,305.012,38.84,256,38.84z"/><path d="M99.918,121.689c-36.655,0-66.475,29.82-66.475,66.475c0,36.655,29.82,66.475,66.475,66.475c9.298,0,18.152-1.926,26.195-5.388c13.906-5.987,25.372-16.585,32.467-29.86c4.98-9.317,7.813-19.946,7.813-31.227C166.393,151.51,136.573,121.689,99.918,121.689z"/><path d="M412.082,121.689c-36.655,0-66.475,29.82-66.475,66.475c0,11.282,2.833,21.911,7.813,31.227c7.095,13.276,18.561,23.874,32.467,29.86c8.043,3.462,16.897,5.388,26.195,5.388c36.655,0,66.475-29.82,66.475-66.475C478.557,151.509,448.737,121.689,412.082,121.689z"/></svg>' },
  { key: 'emotionen', label: ITK_TEXT.icon.symbole.emotionen, svg: '<svg viewBox="0 0 512.001 512.001" xmlns="http://www.w3.org/2000/svg"><path d="m256.001 477.407c-2.59 0-5.179-.669-7.499-2.009-2.52-1.454-62.391-36.216-123.121-88.594-35.994-31.043-64.726-61.833-85.396-91.513-26.748-38.406-40.199-75.348-39.982-109.801.254-40.09 14.613-77.792 40.435-106.162 26.258-28.848 61.3-44.734 98.673-44.734 47.897 0 91.688 26.83 116.891 69.332 25.203-42.501 68.994-69.332 116.891-69.332 35.308 0 68.995 14.334 94.859 40.362 28.384 28.563 44.511 68.921 44.247 110.724-.218 34.393-13.921 71.279-40.728 109.632-20.734 29.665-49.426 60.441-85.279 91.475-60.508 52.373-119.949 87.134-122.45 88.588-2.331 1.354-4.937 2.032-7.541 2.032z"/></svg>' },
  { key: 'logo', label: ITK_TEXT.icon.symbole.logo, svg: ITK_LOGO_SVG }
];
const ITK_ICON_MAX_BYTES = 300 * 1024;

/* Bereinigte Quell-SVGs (Formen auf #000000 normiert) und daraus abgeleitete,
   eingefärbte Bitmaps. Der Platzhalter #000000 wird beim Rendern durch die
   jeweils gültige Sekundärfarbe ersetzt – deshalb ein Cache pro Farbe. */
const itkIconSrc   = {};   // key -> { svg, vbW, vbH }
const itkIconCache = {};   // 'key|#RRGGBB' -> { img, ready, vbW, vbH }

/* Bilder, die in einzelnen Kacheln liegen. Im Design steht nur die Data-URL
   (JSON-fähig, überlebt Vorlagen und die Hover-Vorschau), das dekodierte
   Bild hängt hier daneben. */
const itkTileImgs = {};    // src -> { img, ready }
function itkTileImage(src) {
  if (!src) return null;
  const hit = itkTileImgs[src];
  if (hit) return hit.ready ? hit.img : null;
  const rec = { img: new Image(), ready: false };
  itkTileImgs[src] = rec;
  rec.img.onload = () => { rec.ready = true; itkRedraw(); };
  rec.img.onerror = () => { rec.ready = false; };
  rec.img.src = src;
  return null;
}

/* Bild formatfüllend in ein Rechteck legen (wie CSS cover). */
function itkCoverFit(img, r) {
  const s = Math.max(r.w / img.width, r.h / img.height);
  const w = img.width * s, h = img.height * s;
  return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - h) / 2, w: w, h: h };
}
let   itkCustomIconLabel = ITK_TEXT.icon.eigenesStandardname;

function itkSanitizeIconSVG(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = doc.querySelector('svg');
  if (!root || doc.querySelector('parsererror')) return null;

  root.querySelectorAll('script, foreignObject').forEach(n => n.remove());
  root.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(a => { if (/^on/i.test(a.name)) el.removeAttribute(a.name); });
  });

  const SHAPE = 'path, rect, circle, ellipse, polygon, polyline, line';
  root.querySelectorAll(SHAPE).forEach(el => {
    const hasStroke = el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none';
    const fillNone = el.getAttribute('fill') === 'none' || /fill:\s*none/i.test(el.getAttribute('style') || '');
    el.removeAttribute('style');
    if (fillNone && hasStroke) { el.setAttribute('fill', 'none'); el.setAttribute('stroke', '#000000'); }
    else { el.setAttribute('fill', '#000000'); el.removeAttribute('stroke'); }
  });

  let vb = (root.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
  if (vb.length !== 4 || vb.some(isNaN)) {
    const w = parseFloat(root.getAttribute('width')) || 100;
    const h = parseFloat(root.getAttribute('height')) || 100;
    vb = [0, 0, w, h];
  }
  root.setAttribute('viewBox', vb.join(' '));
  root.removeAttribute('width'); root.removeAttribute('height');
  return { svg: new XMLSerializer().serializeToString(root), vbW: vb[2], vbH: vb[3] };
}

/* Liefert das eingefärbte Icon oder null, solange es noch lädt; sobald es
   fertig ist, wird von selbst neu gezeichnet. */
function itkIconImage(key, color) {
  const src = itkIconSrc[key];
  if (!src) return null;
  const ck = key + '|' + color;
  const hit = itkIconCache[ck];
  if (hit) return hit.ready ? hit : null;

  const rec = { img: new Image(), ready: false, vbW: src.vbW, vbH: src.vbH };
  itkIconCache[ck] = rec;
  rec.img.onload = () => { rec.ready = true; itkRedraw(); };
  rec.img.src = 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(src.svg.replace(/#000000/g, color));
  return null;
}

// ---------------------------------------------------------------------
// 6. STATE – alles Gestalterische hängt am Motiv, damit mehrere Motive
//    in einer Session nebeneinander bestehen können.
// ---------------------------------------------------------------------
function itkNewDesign() {
  return {
    iconKey: 'none',
    iconBg: KBR.magenta,
    iconFg: KBR.white,
    areaId: 'bottom-s',
    areaBeforeFull: null, // Bereich vor dem Umschalten auf „Kein Bild“
    tileCount: 3,
    tiles: [],            // { x, y, w, h, color }
    swoosh: 'none',       // 'none' | 'photo' | 'tile' | 'mask'
    swooshColor: KBR.lightgreen,
    maskBase: KBR.magenta,
    textMode: 'none',     // 'none' | 'schlagwort' | 'headline'
    textValue: '',
    textColor: KBR.lightblue
  };
}
function itkNewMotif(name) {
  return {
    id: 'm' + Math.random().toString(36).slice(2, 9),
    name: name,
    img: null, src: null,
    x: 0, y: 0, scale: 1,
    design: itkNewDesign()
  };
}

let itkMotifs = [];
let itkActiveId = null;
let itkTemplates = [];

let itkDragging = false, itkDragSX = 0, itkDragSY = 0, itkDragIX = 0, itkDragIY = 0;
let itkPinchDist = 0, itkPinchScale = 1;
let itkWidget = 'none';
let itkShowOverlays = true;  // Overlays sind der sinnvolle Grundzustand in der Widget-Vorschau
let itkHitRegions = [];          // Treffer-Flächen für den Doppelklick
let itkPreviewCanvases = [];
let itkPopTarget = null;
let itkTileTarget = -1;   // Kachel, die gerade ein Bild bekommen soll

let itkCanvas, itkCtx, itkStage, itkDropHint;

function itkM() { return itkMotifs.find(m => m.id === itkActiveId) || itkMotifs[0]; }

// ---------------------------------------------------------------------
// 7. KACHELAUFTEILUNG
// Rekursives Teilen der Startrechtecke, immer bevorzugt entlang der
// längeren Seite – so entstehen keine Splitter, sondern Flächen, die den
// Beispielen aus dem Styleguide entsprechen. Die Kontur wird beim Teilen
// direkt abgezogen, damit alle Fugen gleich breit bleiben.
// ---------------------------------------------------------------------
const ITK_TILE_MIN = 70;

function itkSplitTiles(seeds, n, rnd) {
  let rects = seeds.map(r => ({ ...r }));
  let guard = 0;
  while (rects.length < n && guard++ < 60) {
    const order = [...rects].sort((a, b) => (b.w * b.h) - (a.w * a.h));
    let done = false;
    for (let k = 0; k < order.length && !done; k++) {
      // Leichte Streuung: meist die größte Fläche, gelegentlich die nächste.
      const idx = Math.min(order.length - 1, k + (rnd() < 0.25 ? 1 : 0));
      const t = order[idx];
      const cut = itkCutRect(t, rnd);
      if (!cut) continue;
      rects = rects.filter(r => r !== t).concat(cut);
      done = true;
    }
    if (!done) break;
  }
  return rects;
}

function itkCutRect(t, rnd) {
  const g = ITK_GAP / 2;
  const canV = t.w > (ITK_TILE_MIN * 2 + ITK_GAP);
  const canH = t.h > (ITK_TILE_MIN * 2 + ITK_GAP);
  if (!canV && !canH) return null;

  let vertical;                                   // vertikale Schnittlinie -> nebeneinander
  if (canV && canH) vertical = t.w >= t.h * 1.15 ? true : (t.h > t.w * 1.15 ? false : rnd() > 0.5);
  else vertical = canV;

  const f = 0.36 + rnd() * 0.28;
  if (vertical) {
    const cut = Math.round(t.w * f);
    if (cut - g < ITK_TILE_MIN || t.w - cut - g < ITK_TILE_MIN) return null;
    return [ { x: t.x, y: t.y, w: cut - g, h: t.h },
             { x: t.x + cut + g, y: t.y, w: t.w - cut - g, h: t.h } ];
  }
  const cut = Math.round(t.h * f);
  if (cut - g < ITK_TILE_MIN || t.h - cut - g < ITK_TILE_MIN) return null;
  return [ { x: t.x, y: t.y, w: t.w, h: cut - g },
           { x: t.x, y: t.y + cut + g, w: t.w, h: t.h - cut - g } ];
}

/* Zwei Kacheln gelten als benachbart, wenn sie sich eine Fuge teilen.
   Nachbarn bekommen unterschiedliche Primärfarben – sonst verschmelzen
   sie optisch zu einer Fläche. */
function itkAdjacent(a, b) {
  const tol = ITK_GAP * 1.6;
  const ovY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const ovX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  if (ovY > 2 && (Math.abs(a.x + a.w - b.x) < tol || Math.abs(b.x + b.w - a.x) < tol)) return true;
  if (ovX > 2 && (Math.abs(a.y + a.h - b.y) < tol || Math.abs(b.y + b.h - a.y) < tol)) return true;
  return false;
}

function itkColorTiles(tiles, rnd) {
  tiles.forEach(t => { t.color = null; });
  tiles.forEach(t => {
    const used = new Set();
    tiles.forEach(o => { if (o !== t && o.color && itkAdjacent(t, o)) used.add(o.color); });
    let avail = KBR_PRIMARIES.filter(c => !used.has(c));
    if (!avail.length) avail = KBR_PRIMARIES.slice();
    t.color = avail[Math.floor(rnd() * avail.length)];
  });
}

/* Neue Aufteilung erzeugen. keepColors: Farben nach Möglichkeit behalten
   (beim reinen Ändern der Kachelzahl), sonst neu würfeln. */
function itkRebuildTiles(m, keepColors) {
  const d = m.design;
  const area = itkArea(d.areaId);
  if (!area || !area.split) { d.tiles = []; return; }

  const prev = keepColors ? d.tiles.map(t => t.color) : null;
  // Eingesetzte Kachelbilder überleben auch das Würfeln – sie stillschweigend
  // zu verlieren wäre für den Nutzer ein Datenverlust.
  const prevSrc = d.tiles.map(t => t.src);
  const { seeds } = itkRegions(area.split, ITK_W, ITK_H, ITK_GAP);
  const n = Math.max(area.min, Math.min(itkMaxTiles(d), d.tileCount));
  d.tiles = itkMtOn(d) ? itkMtTiles(seeds[0], n) : itkSplitTiles(seeds, n, Math.random);
  itkColorTiles(d.tiles, Math.random);
  if (prev) d.tiles.forEach((t, i) => { if (prev[i]) t.color = prev[i]; });
  d.tiles.forEach((t, i) => { if (prevSrc[i]) t.src = prevSrc[i]; });
  itkEnforceTileImageLimit(d);
  itkEnforceSwooshColor(m);
}

/* Nach jeder Farbänderung prüfen, ob die Swoosh-Farbe noch erlaubt ist. */
function itkEnforceSwooshColor(m) {
  const d = m.design;
  if (d.swoosh === 'tile' && d.tiles.length === 1) {
    d.swooshColor = kbrFix(d.swooshColor, kbrAllowedOn(d.tiles[0].color));
  } else if (d.swoosh === 'mask') {
    d.swooshColor = kbrFix(d.swooshColor, kbrAllowedOn(d.maskBase));
  } else if (d.swoosh === 'photo') {
    d.swooshColor = kbrFix(d.swooshColor, KBR_SWOOSH_ON_PHOTO);
  }
  d.iconFg = kbrFix(d.iconFg, kbrAllowedOn(d.iconBg));
  // Die Schrift folgt derselben Regel wie Icon und Swoosh: erlaubt ist nur,
  // was auf der Farbe der tragenden Kachel stehen darf.
  const tt = itkMtTile(d);
  if (tt) d.textColor = kbrFix(d.textColor, kbrTextOn(tt.color));
}

// ---------------------------------------------------------------------
// 8. RENDERING
// Zeichnet ein Motiv in einen 1180×623-Kontext. `collect` registriert
// dabei die Trefferflächen für den Farb-Doppelklick – das passiert nur
// für das aktive Motiv, nicht für Thumbnails oder den Sammelexport.
// ---------------------------------------------------------------------
const ITK_ICON_SIZE = 202;      // Kantenlänge der quadratischen Icon-Kachel
const ITK_LOGO_INNER = 0.44;    // Höhe des Logos im Verhältnis zur Trägerfläche

/* Breite der Logo-Trägerfläche: so viel Luft links und rechts wie oben und
   unten. Ergibt bei der gelieferten Logodatei dasselbe Verhältnis wie in der
   Vorlage (Trägerfläche 479 × 200, Logo 350 × 74). */
function itkLogoWidth() {
  const src = itkIconSrc.logo;
  const ih = ITK_ICON_SIZE * ITK_LOGO_INNER;
  const iw = ih * (src ? src.vbW / src.vbH : 4.732);
  return Math.round(iw + (ITK_ICON_SIZE - ih));
}

// ---------------------------------------------------------------------
// 8a. TEXT IM MOTIV
// Alle Maße stammen aus den Vorlagen des Kunden: Die Textbox liegt fest
// bei x 266…914 (in den Regelungs-PDFs die magentafarbenen Marken), die
// Textkachel selbst bei x 202…978. Die Schriftgröße wächst und schrumpft
// nur innerhalb der freigegebenen Punktbereiche.
// ---------------------------------------------------------------------
const ITK_MT_BOX  = { x: 266, w: 648 };   // feste Breite, bis hierhin darf Text laufen
const ITK_MT_COL  = { x: 202, w: 776 };   // feste Textkachel, wenn Kacheln daneben stehen
const ITK_MT_CAP  = 0.668;                // Versalhöhe von TeleNeo ExtraBold
const ITK_MT_LINE = 1.2;                  // Zeilenabstand der Vorlage
const ITK_MT_FONT = '"TeleNeo Motiv", "TeleNeo", sans-serif';
/* Punktgrößen wie in den Vorlagen: Ein Schlagwort wächst von 56 auf bis zu
   80 pt, je kürzer desto größer. Eine Headline steht einzeilig bei 48 pt und
   zweizeilig bei 56 pt; kleiner wird sie nur, wenn sie sonst aus der Box liefe. */
const ITK_MT_MODES = {
  schlagwort: { min: 56, max: 80, italic: true,  upper: true,  maxLines: 1, maxWorte: 2 },
  headline:   { min: 48, max: 56, italic: false, upper: false, maxLines: 2, eineZeile: 48 }
};
const ITK_MT_MAX_TILES = 3;     // Textkachel plus je eine links und rechts

function itkMtOn(d) { return !!d.textMode && d.textMode !== 'none'; }
function itkMtCfg(d) { return ITK_MT_MODES[d.textMode] || null; }
function itkMaxTiles(d) { return itkMtOn(d) ? ITK_MT_MAX_TILES : 5; }

/* Eigener Messkontext: Das Layout wird mitten im Zeichnen gebraucht und darf
   die Schrifteinstellung des Motivkontexts nicht umstellen. */
let itkMtCtx = null;
function itkMtMeasureCtx() {
  if (!itkMtCtx) itkMtCtx = document.createElement('canvas').getContext('2d');
  return itkMtCtx;
}
function itkMtFont(fs, cfg) {
  return (cfg.italic ? 'italic ' : '') + '800 ' + itkNum(fs) + 'px ' + ITK_MT_FONT;
}
function itkMtWidth(s, fs, cfg) {
  const c = itkMtMeasureCtx();
  c.font = itkMtFont(fs, cfg);
  return c.measureText(s).width;
}

/* Gierig umbrechen – erste Zeile so voll wie möglich. Genau so stehen die
   beiden Zeilen in der Vorlage. Gibt null zurück, wenn alles in eine passt. */
function itkMtWrap(words, fs, cfg, maxW) {
  const erste = [];
  let i = 0;
  while (i < words.length) {
    const probe = erste.concat(words[i]).join(' ');
    if (erste.length && itkMtWidth(probe, fs, cfg) > maxW) break;
    erste.push(words[i]); i++;
  }
  if (i >= words.length) return null;
  return [erste.join(' '), words.slice(i).join(' ')];
}

/* Zeilen und Schriftgröße bestimmen. Eine Zeile hat Vorrang: Erst wenn der
   Text auch in der kleinsten erlaubten Stufe nicht in eine Zeile passt, wird
   umbrochen. So entstehen exakt die Größen der Vorlagen (48 pt einzeilig,
   56 pt zweizeilig, 80 bzw. 56 pt beim Schlagwort). */
function itkMtLayout(d) {
  const cfg = itkMtCfg(d);
  if (!cfg) return null;
  const roh = String(d.textValue || '').replace(/\s+/g, ' ').trim();
  if (!roh) return null;
  const s = cfg.upper ? roh.toUpperCase() : roh;
  const maxW = ITK_MT_BOX.w;

  // Einzeilig: das Schlagwort sucht sich die größte passende Stufe, die
  // Headline bleibt bei ihren 48 pt.
  for (let fs = cfg.eineZeile || cfg.max; fs >= cfg.min; fs--) {
    if (itkMtWidth(s, fs, cfg) <= maxW) return { cfg: cfg, fs: fs, lines: [s] };
  }
  if (cfg.maxLines > 1) {
    const words = s.split(' ');
    for (let fs = cfg.max; fs >= cfg.min; fs--) {
      const w = itkMtWrap(words, fs, cfg, maxW);
      if (w && itkMtWidth(w[0], fs, cfg) <= maxW && itkMtWidth(w[1], fs, cfg) <= maxW) {
        return { cfg: cfg, fs: fs, lines: w };
      }
    }
  }
  // Notnagel: lieber kleiner als vorgesehen als über die Textbox hinaus.
  for (let fs = cfg.min - 1; fs >= 12; fs--) {
    if (itkMtWidth(s, fs, cfg) <= maxW) return { cfg: cfg, fs: fs, lines: [s], eng: true };
    if (cfg.maxLines > 1) {
      const w = itkMtWrap(s.split(' '), fs, cfg, maxW);
      if (w && itkMtWidth(w[1], fs, cfg) <= maxW) return { cfg: cfg, fs: fs, lines: w, eng: true };
    }
  }
  return { cfg: cfg, fs: 12, lines: [s], eng: true };
}
function itkMtLines(d) {
  const lay = itkMtLayout(d);
  return lay ? lay.lines.length : 1;
}

/* Grenzen der Eingabe. Ein Schlagwort sind höchstens zwei Wörter, und kein
   Text darf so lang werden, dass er unter seine freigegebene Punktgröße
   schrumpfen müsste. Was darüber hinausginge, wird gar nicht erst
   angenommen – statt immer kleiner zu werden, endet die Eingabe einfach. */
function itkMtClamp(d, wert) {
  const cfg = itkMtCfg(d);
  if (!cfg) return wert;
  let s = String(wert);
  if (cfg.maxWorte) {
    const worte = s.trim().split(/\s+/).filter(Boolean);
    if (worte.length > cfg.maxWorte) s = worte.slice(0, cfg.maxWorte).join(' ');
  }
  // Zeichenweise zurücknehmen, bis die kleinste erlaubte Stufe wieder reicht.
  let schutz = 400;
  while (s.trim() && schutz-- > 0) {
    const lay = itkMtLayout({ textMode: d.textMode, textValue: s });
    if (!lay || !lay.eng) break;
    s = s.slice(0, -1);
  }
  return s;
}

/* Auf welcher Kachel sitzt der Text? Auf der, die die feste Textspalte trägt. */
function itkMtTile(d) {
  if (!d.tiles || !d.tiles.length) return null;
  const cx = ITK_MT_BOX.x + ITK_MT_BOX.w / 2;
  return d.tiles.find(t => cx >= t.x && cx <= t.x + t.w) || d.tiles[0];
}

/* Kachelaufteilung im Textmodus. Anders als sonst wird hier nicht gewürfelt:
   Die mittlere Kachel muss die Textspalte tragen, sonst liefe der Text über
   eine Farbkante. Links und rechts darf je eine weitere Kachel stehen. */
function itkMtTiles(seed, n) {
  const g = ITK_GAP / 2;
  const L = ITK_MT_COL.x, R = ITK_MT_COL.x + ITK_MT_COL.w;
  const y = seed.y, h = seed.h, x0 = seed.x, x1 = seed.x + seed.w;
  if (n <= 1) return [{ x: x0, y: y, w: seed.w, h: h }];
  if (n === 2) return [{ x: x0,    y: y, w: R - g - x0, h: h },
                       { x: R + g, y: y, w: x1 - R - g, h: h }];
  return [{ x: x0,    y: y, w: L - g - x0,    h: h },
          { x: L + g, y: y, w: R - L - g * 2, h: h },
          { x: R + g, y: y, w: x1 - R - g,    h: h }];
}

/* Fertige Geometrie des Textblocks. Senkrecht sitzt er optisch mittig in
   seiner Kachel: ausgerichtet wird die Versalhöhe, nicht die Zeilenbox –
   damit steht er genauso wie in den Vorlagen. */
function itkMtBlock(m) {
  const d = m.design;
  const lay = itkMtLayout(d);
  if (!lay) return null;
  const tile = itkMtTile(d);
  if (!tile) return null;
  const lh = lay.fs * ITK_MT_LINE;
  const cap = lay.fs * ITK_MT_CAP;
  const blockH = (lay.lines.length - 1) * lh + cap;
  const erste = tile.y + tile.h / 2 - blockH / 2 + cap;
  // Einzeilig steht mittig, zweizeilig linksbündig – so die Vorlagen.
  const mittig = lay.lines.length === 1;
  return {
    lines: lay.lines, fs: lay.fs, cfg: lay.cfg, tile: tile, eng: !!lay.eng,
    lh: lh, cap: cap, blockH: blockH, top: erste - cap,
    align: mittig ? 'center' : 'left',
    x: mittig ? ITK_MT_BOX.x + ITK_MT_BOX.w / 2 : ITK_MT_BOX.x,
    baselines: lay.lines.map((_, i) => erste + i * lh),
    color: d.textColor
  };
}

function itkDrawPhoto(ctx, m, clip) {
  if (!m.img) return;
  ctx.save();
  if (clip) { ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip(); }
  ctx.translate(ITK_W / 2 + m.x, ITK_H / 2 + m.y);
  ctx.scale(m.scale, m.scale);
  ctx.drawImage(m.img, -m.img.width / 2, -m.img.height / 2);
  ctx.restore();
}

/* Lage des Swooshs als reine Zahlen. Canvas und SVG-Export rechnen damit
   dasselbe, statt die Formel zweimal zu führen. */
function itkSwooshPlacement(rect, factor) {
  const s = Math.min(rect.w / ITK_SWOOSH_VB.w, rect.h / ITK_SWOOSH_VB.h) * factor;
  const w = ITK_SWOOSH_VB.w * s, h = ITK_SWOOSH_VB.h * s;
  return { s: s, tx: rect.x + (rect.w - w) / 2, ty: rect.y + (rect.h - h) / 2 };
}

/* Swoosh in ein Zielrechteck legen. factor > 1 lässt ihn bewusst über die
   Kanten hinauslaufen. */
function itkSwooshTransform(ctx, rect, factor) {
  const p = itkSwooshPlacement(rect, factor);
  ctx.translate(p.tx, p.ty);
  ctx.scale(p.s, p.s);
}

/* Lage des großen Masken-Swooshs, 1:1 aus der gelieferten Layout-Vorlage
   „Main_Image_1180x623px – 70.svg“ übernommen: der Swoosh liegt achsparallel
   (keine Drehung), rund 1,68-fach vergrößert und so verschoben, dass drei
   Schwünge das Bild queren. Die farbige Kante ist dieselbe Form, um
   (108,6 | 50) nach unten rechts versetzt – daher die keilförmigen Ausläufe.
   Einmal zentral definiert, weil Zeichnen und Treffertest für den
   Doppelklick exakt dieselbe Transformation brauchen. */
const ITK_MASK = {
  edgeScale: 1.683,                    // Skalierung des Originalpfades (viewBox 1000 × 903,67)
  edgeX: -238.661, edgeY: -448.965,    // Lage der farbigen Kante
  photoX: 10390.999, photoY: -13505.965 // Lage der Fotofläche
};

/* Die Fotofläche ist keine verschobene Kopie des Swooshs, sondern eine eigene
   Schnittmengen-Form aus der Vorlage – deshalb steht sie hier als eigener
   Pfad. Nur so entstehen die typischen Keile, bei denen das Grün mal ober-,
   mal unterhalb des Fotos sitzt. */
const ITK_MASK_PHOTO_D = 'M-10294.625,14527.929q-1.381-4.444-2.417-9.063a113.9,113.9,0,0,1,86.289-136.023l404.765-90.545c-40.221-8.23-74.708-14.485-99.333-17.6-120.08-15.071-480.62-15.368-609.4-14.2-.345,0-.7,0-1.041,0a113.9,113.9,0,0,1-112.172-94.193,113.9,113.9,0,0,1,74.319-127.141l545.748-192.354-315.473,27.8a113.942,113.942,0,0,1-121.913-92.309,113.909,113.909,0,0,1,79.818-130.444c2.35-.7,193.776-57.252,424.844-146.93h555.705c-46.753,23.66-95.432,47.681-144.551,71.038l320.433-28.237v259.054l-681.7,240.285q7.258.776,13.857,1.6c155.421,19.654,586.175,132.475,604.438,137.27A113.742,113.742,0,0,1-9209,14229.4v133.431a113.764,113.764,0,0,1-67.457,44.44l-539.348,120.655Z';
const ITK_MASK_PHOTO_PATH = new Path2D(ITK_MASK_PHOTO_D);

function itkMaskEdgeTransform(ctx) {
  ctx.translate(ITK_MASK.edgeX, ITK_MASK.edgeY);
  ctx.scale(ITK_MASK.edgeScale, ITK_MASK.edgeScale);
}
function itkMaskPhotoTransform(ctx) {
  ctx.translate(ITK_MASK.photoX, ITK_MASK.photoY);
}

// ---------------------------------------------------------------------
// 8b. EBENENLISTE
// Die Zeichnung liegt als Liste benannter Ebenen vor statt als ein Block
// Zeichenbefehle. Vorschau, JPG, PSD und SVG greifen auf dieselbe Liste zu –
// dadurch können Bildschirm und exportierte Datei gar nicht auseinander-
// laufen. Die Reihenfolge der Liste ist zugleich Zeichenreihenfolge,
// Stapelreihenfolge in Photoshop und Reihenfolge der Trefferflächen.
//
// Vertrag für draw(): Der Kontext steht unverdreht 1:1 auf einem
// 1180×623-Ziel – der Maskenzweig verlässt sich auf setTransform(1,0,0,1,0,0)
// – und wird ausgeglichen hinterlassen, jedes save() hat sein restore().
//
// Nicht zwischenspeichern: itkHoverPreview tauscht m.design vorübergehend
// aus. Eine Merkliste nach m.id würde die Hover-Vorschau stillschweigend
// einfrieren.
// ---------------------------------------------------------------------
function itkBuildLayers(m) {
  const d = m.design;
  const area = itkArea(d.areaId);
  const split = area ? area.split : null;
  const L = [];

  // Ebene ganz unten: Die weißen Konturen sind kein eigenes Objekt, sondern
  // genau diese Fläche, die zwischen den Kacheln durchscheint.
  L.push({
    id: 'bg', name: ITK_TEXT.ebenen.hintergrund, group: null, hit: null,
    draw: ctx => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ITK_W, ITK_H); },
    svg: () => '<rect x="0" y="0" width="' + ITK_W + '" height="' + ITK_H + '" fill="#FFFFFF"/>'
  });

  // --- Sonderfall: Swoosh als Maske. Der Swoosh ersetzt hier das Layout –
  // farbige Vollfläche, darauf eine farbige Kante, darin das Foto.
  if (d.swoosh === 'mask') {
    L.push({
      id: 'maskBase', name: itkT(ITK_TEXT.ebenen.grundflaechePraefix, { farbe: KBR_NAMES[d.maskBase] }), group: ITK_TEXT.ebenen.gruppeMaske,
      hit: { kind: 'maskBase', mask: true },
      draw: ctx => { ctx.fillStyle = d.maskBase; ctx.fillRect(0, 0, ITK_W, ITK_H); },
      svg: () => '<rect x="0" y="0" width="' + ITK_W + '" height="' + ITK_H +
                 '" fill="' + d.maskBase + '"/>'
    });
    L.push({
      id: 'maskEdge', name: itkT(ITK_TEXT.ebenen.swooshKantePraefix, { farbe: KBR_NAMES[d.swooshColor] }), group: ITK_TEXT.ebenen.gruppeMaske,
      hit: { kind: 'maskEdge', mask: true },
      draw: ctx => {
        ctx.save();
        itkMaskEdgeTransform(ctx);
        ctx.fillStyle = d.swooshColor;
        ctx.fill(ITK_SWOOSH_PATH);
        ctx.restore();
      },
      svg: () => '<g transform="translate(' + ITK_MASK.edgeX + ',' + ITK_MASK.edgeY +
                 ') scale(' + ITK_MASK.edgeScale + ')"><path d="' + ITK_SWOOSH_D +
                 '" fill="' + d.swooshColor + '"/></g>'
    });
    const mcid = 'itkclip-' + m.id + '-maskphoto';
    L.push({
      id: 'photo', name: ITK_TEXT.ebenen.foto, group: ITK_TEXT.ebenen.gruppeMaske, hit: null,
      draw: ctx => {
        ctx.save();
        itkMaskPhotoTransform(ctx);
        ctx.clip(ITK_MASK_PHOTO_PATH);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        itkDrawPhoto(ctx, m, null);
        ctx.restore();
      },
      // In SVG löst sich der Koordinatenwechsel von selbst: der Clip lebt im
      // clipPath, das Bild trägt seine eigene Transformation.
      defs: () => '<clipPath id="' + mcid + '"><path d="' + ITK_MASK_PHOTO_D +
                  '" transform="translate(' + ITK_MASK.photoX + ',' + ITK_MASK.photoY +
                  ')"/></clipPath>',
      svg: () => itkPhotoSVG(m, 'url(#' + mcid + ')')
    });
    itkPushIconLayers(L, m);
    return L;
  }

  // --- Regelfall: Foto auf der Restfläche, Kacheln daneben.
  const { photo } = itkRegions(split, ITK_W, ITK_H, ITK_GAP);
  const pcid = 'itkclip-' + m.id + '-photo';
  L.push({
    id: 'photo', name: ITK_TEXT.ebenen.foto, group: null, hit: null,
    draw: ctx => { itkDrawPhoto(ctx, m, split ? photo : null); },
    defs: split ? () => itkClipRectSVG(pcid, photo) : null,
    svg: () => itkPhotoSVG(m, split ? 'url(#' + pcid + ')' : null)
  });

  // Bilder in Kacheln gehören zum Modus ohne Foto. Kehrt man zu einem
  // Fotolayout zurück, bleiben sie zwar erhalten, werden aber nicht gezeigt –
  // ein Wechsel zurück holt sie unverändert wieder hervor.
  const zeigeKachelbild = itkIsFullTiles(d);
  d.tiles.forEach((t, i) => {
    const kcid = 'itkclip-' + m.id + '-tile' + i;
    const tsrc = zeigeKachelbild ? t.src : null;
    L.push({
      id: 'tile' + i, group: ITK_TEXT.ebenen.gruppeKacheln,
      name: itkT(ITK_TEXT.ebenen.kachelPraefix, { n: i + 1 }) +
            (tsrc ? ITK_TEXT.ebenen.kachelBildZusatz
                  : itkT(ITK_TEXT.ebenen.kachelFarbeZusatz, { farbe: KBR_NAMES[t.color] })),
      hit: { kind: 'tile', index: i, rect: t },
      draw: ctx => {
        // Solange ein eingesetztes Bild noch lädt, steht die Farbe – so
        // bleibt die Kachel nie leer.
        const img = itkTileImage(tsrc);
        if (!img) { ctx.fillStyle = t.color; ctx.fillRect(t.x, t.y, t.w, t.h); return; }
        ctx.save();
        ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
        const f = itkCoverFit(img, t);
        ctx.drawImage(img, f.x, f.y, f.w, f.h);
        ctx.restore();
      },
      defs: () => (tsrc ? itkClipRectSVG(kcid, t) : ''),
      svg: () => {
        const img = itkTileImage(tsrc);
        if (!img) {
          return '<rect x="' + itkNum(t.x) + '" y="' + itkNum(t.y) + '" width="' + itkNum(t.w) +
                 '" height="' + itkNum(t.h) + '" fill="' + t.color + '"/>';
        }
        const f = itkCoverFit(img, t);
        const href = itkXmlAttr(tsrc);
        return '<g clip-path="url(#' + kcid + ')"><image href="' + href + '" xlink:href="' + href +
               '" x="' + itkNum(f.x) + '" y="' + itkNum(f.y) + '" width="' + itkNum(f.w) +
               '" height="' + itkNum(f.h) + '" preserveAspectRatio="none"/></g>';
      }
    });
  });

  // Text liegt über der Kachel, aber unter Swoosh und Icon.
  const tb = itkMtBlock(m);
  if (tb) {
    L.push({
      id: 'motivText', name: ITK_TEXT.ebenen.text, group: null,
      hit: { kind: 'motivText', rect: { x: ITK_MT_BOX.x, y: tb.top - tb.fs * 0.25,
                                        w: ITK_MT_BOX.w, h: tb.blockH + tb.fs * 0.5 } },
      draw: ctx => {
        ctx.save();
        ctx.fillStyle = tb.color;
        ctx.font = itkMtFont(tb.fs, tb.cfg);
        ctx.textAlign = tb.align;
        ctx.textBaseline = 'alphabetic';
        tb.lines.forEach((l, i) => ctx.fillText(l, tb.x, tb.baselines[i]));
        ctx.restore();
      },
      // Im SVG bleibt der Text echter Text – in Illustrator und InDesign
      // lässt er sich damit weiterbearbeiten, nicht nur betrachten.
      svg: () => {
        const tsp = tb.lines.map((l, i) =>
          '<tspan x="' + itkNum(tb.x) + '" y="' + itkNum(tb.baselines[i]) + '">' +
          itkXmlText(l) + '</tspan>').join('');
        return '<text font-family="TeleNeo" font-weight="800"' +
               (tb.cfg.italic ? ' font-style="italic"' : '') +
               ' font-size="' + itkNum(tb.fs) + '" fill="' + tb.color + '"' +
               (tb.align === 'center' ? ' text-anchor="middle"' : '') +
               '>' + tsp + '</text>';
      }
    });
  }

  if (d.swoosh === 'tile' && d.tiles.length === 1) {
    const t = d.tiles[0];
    const tcid = 'itkclip-' + m.id + '-swooshtile';
    L.push({
      id: 'swooshTile', name: ITK_TEXT.ebenen.swooshInKachel, group: null,
      // Nach der Kachel registriert und als Pfad geprüft: der Doppelklick
      // trifft den Swoosh nur dort, wo er wirklich liegt – daneben bleibt die
      // Kachel erreichbar.
      hit: { kind: 'swooshTile', tile: t, swooshFit: 1.35 },
      draw: ctx => {
        ctx.save();
        ctx.beginPath(); ctx.rect(t.x, t.y, t.w, t.h); ctx.clip();
        ctx.save();
        // Bewusst über die Kachel hinaus skaliert: In der Vorlage läuft der
        // Swoosh am Rand aus dem Feld heraus, statt darin zu schwimmen.
        itkSwooshTransform(ctx, t, 1.35);
        ctx.fillStyle = d.swooshColor;
        ctx.fill(ITK_SWOOSH_PATH);
        ctx.restore();
        ctx.restore();
      },
      defs: () => itkClipRectSVG(tcid, t),
      svg: () => itkSwooshSVG(t, 1.35, d.swooshColor, 'url(#' + tcid + ')')
    });
  }

  // --- Swoosh direkt auf dem Foto: rechtsbündig auf der Fotofläche.
  if (d.swoosh === 'photo') {
    const p = split ? photo : { x: 0, y: 0, w: ITK_W, h: ITK_H };
    const h = p.h * 0.76;
    const w = h * (ITK_SWOOSH_VB.w / ITK_SWOOSH_VB.h);
    const rect = { x: p.x + p.w - w - p.w * 0.02, y: p.y + (p.h - h) / 2, w, h };
    const scid = 'itkclip-' + m.id + '-swooshphoto';
    L.push({
      id: 'swooshPhoto', name: ITK_TEXT.ebenen.swooshAufFoto, group: null,
      hit: { kind: 'swooshPhoto', rect },
      draw: ctx => {
        ctx.save();
        ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
        ctx.save();
        itkSwooshTransform(ctx, rect, 1);
        ctx.fillStyle = d.swooshColor;
        ctx.fill(ITK_SWOOSH_PATH);
        ctx.restore();
        ctx.restore();
      },
      defs: () => itkClipRectSVG(scid, p),
      svg: () => itkSwooshSVG(rect, 1, d.swooshColor, 'url(#' + scid + ')')
    });
  }

  itkPushIconLayers(L, m);
  return L;
}

/* Icon: quadratische Kachel exakt in der Mitte des Layouts, mit weißer
   Kontur ringsum. Drei Ebenen statt einer, damit sich in Photoshop Fläche
   und Glyphe getrennt anfassen lassen. Anders als die Fugen zwischen den
   Kacheln ist diese weiße Kontur echte Farbe über der Kachel. */
function itkPushIconLayers(L, m) {
  const d = m.design;
  if (d.iconKey === 'none') return;
  // Das Logo ist ein Icon mit zwei Ausnahmen: breite statt quadratische
  // Trägerfläche und feste Farben – weiß auf Magenta, nicht änderbar.
  const logo = d.iconKey === 'logo';
  const S = ITK_ICON_SIZE, g = ITK_GAP;
  const W = logo ? itkLogoWidth() : S;
  const bg = logo ? KBR.magenta : d.iconBg;
  const fg = logo ? KBR.white : d.iconFg;
  const gruppe = logo ? ITK_TEXT.ebenen.gruppeLogo : ITK_TEXT.ebenen.gruppeIcon;
  const cx = ITK_W / 2, cy = ITK_H / 2;
  const box = { x: cx - W / 2, y: cy - S / 2, w: W, h: S };

  L.push({
    id: 'iconFrame', name: logo ? ITK_TEXT.ebenen.logoKontur : ITK_TEXT.ebenen.iconKontur,
    group: gruppe, hit: null,
    draw: ctx => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(box.x - g, box.y - g, W + g * 2, S + g * 2);
    },
    svg: () => '<rect x="' + itkNum(box.x - g) + '" y="' + itkNum(box.y - g) +
               '" width="' + itkNum(W + g * 2) + '" height="' + (S + g * 2) + '" fill="#FFFFFF"/>'
  });
  L.push({
    id: 'iconArea',
    name: logo ? ITK_TEXT.ebenen.logoFlaeche
               : itkT(ITK_TEXT.ebenen.iconFlaechePraefix, { farbe: KBR_NAMES[d.iconBg] }),
    group: gruppe,
    // Der Treffer sitzt auf der Fläche, nicht auf der Glyphe: die fehlt,
    // solange sie noch lädt. Beim Logo führt er zu keinem Dialog – dort
    // gibt es nichts zu wählen.
    hit: { kind: logo ? 'logo' : 'icon', rect: box },
    draw: ctx => { ctx.fillStyle = bg; ctx.fillRect(box.x, box.y, W, S); },
    svg: () => '<rect x="' + itkNum(box.x) + '" y="' + itkNum(box.y) + '" width="' + itkNum(W) +
               '" height="' + S + '" fill="' + bg + '"/>'
  });
  L.push({
    id: 'iconGlyph', name: logo ? ITK_TEXT.ebenen.logoGrafik : ITK_TEXT.ebenen.iconGlyphe,
    group: gruppe, hit: null,
    draw: ctx => {
      const rec = itkIconImage(d.iconKey, fg);
      if (!rec) return;
      const p = itkIconGlyphBox(rec.vbW, rec.vbH, logo);
      ctx.drawImage(rec.img, cx - p.w / 2, cy - p.h / 2, p.w, p.h);
    },
    svg: () => itkIconGlyphSVG(d)
  });
}

/* Größe der Grafik auf der Trägerfläche. Icons füllen ein Quadrat, das Logo
   behält sein breites Format und richtet sich nach der Höhe. */
function itkIconGlyphBox(vbW, vbH, logo) {
  if (logo) {
    const h = ITK_ICON_SIZE * ITK_LOGO_INNER;
    return { w: h * (vbW / vbH), h: h };
  }
  const inner = ITK_ICON_SIZE * 0.56;
  const s = Math.min(inner / vbW, inner / vbH);
  return { w: vbW * s, h: vbH * s };
}

// ---------------------------------------------------------------------
// 8c. SVG-BAUSTEINE
// Werden nur beim Export aufgerufen, nie beim Zeichnen. Sie rechnen mit
// denselben Zahlen wie die draw()-Rümpfe – die Geometrie steht jeweils nur
// an einer Stelle.
// ---------------------------------------------------------------------
function itkNum(v) { return String(Number(v.toFixed(4))); }
function itkXmlAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function itkXmlText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function itkClipRectSVG(id, r) {
  return '<clipPath id="' + id + '"><rect x="' + itkNum(r.x) + '" y="' + itkNum(r.y) +
         '" width="' + itkNum(r.w) + '" height="' + itkNum(r.h) + '"/></clipPath>';
}

function itkSwooshSVG(rect, factor, color, clipRef) {
  const p = itkSwooshPlacement(rect, factor);
  const g = '<g transform="translate(' + itkNum(p.tx) + ',' + itkNum(p.ty) +
            ') scale(' + itkNum(p.s) + ')"><path d="' + ITK_SWOOSH_D +
            '" fill="' + color + '"/></g>';
  return clipRef ? '<g clip-path="' + clipRef + '">' + g + '</g>' : g;
}

/* Das Foto liegt als Data-URL vor (FileReader bzw. itkDemoImage), das SVG
   ist damit ohne Nebendateien vollständig. href und xlink:href, weil ältere
   Programme nur letzteres kennen. */
function itkPhotoSVG(m, clipRef) {
  if (!m.img) return '';
  const w = m.img.width, h = m.img.height;
  const href = itkXmlAttr(m.src);
  const img = '<image href="' + href + '" xlink:href="' + href +
              '" x="' + itkNum(-w / 2) + '" y="' + itkNum(-h / 2) +
              '" width="' + w + '" height="' + h + '" preserveAspectRatio="none"' +
              ' transform="translate(' + itkNum(ITK_W / 2 + m.x) + ',' +
              itkNum(ITK_H / 2 + m.y) + ') scale(' + itkNum(m.scale) + ')"/>';
  return clipRef ? '<g clip-path="' + clipRef + '">' + img + '</g>' : img;
}

/* Nicht die Bitmap aus itkIconCache, sondern der bereinigte Quelltext:
   itkSanitizeIconSVG normiert alle Formen auf #000000, das Ersetzen liefert
   die eingefärbte Glyphe als echte Pfade. Die viewBox bleibt unangetastet –
   ein verschobener Ursprung wird so automatisch richtig behandelt. */
function itkIconGlyphSVG(d) {
  const src = itkIconSrc[d.iconKey];
  if (!src) return '';
  const logo = d.iconKey === 'logo';
  const p = itkIconGlyphBox(src.vbW, src.vbH, logo);
  return src.svg.replace(/#000000/g, logo ? KBR.white : d.iconFg)
    .replace(/^<svg/i, '<svg x="' + itkNum(ITK_W / 2 - p.w / 2) +
                       '" y="' + itkNum(ITK_H / 2 - p.h / 2) +
                       '" width="' + itkNum(p.w) + '" height="' + itkNum(p.h) + '"');
}

// ---------------------------------------------------------------------
// 8d. ZEICHNEN
// ---------------------------------------------------------------------
function itkDrawMotif(ctx, m, collect) {
  const layers = itkBuildLayers(m);
  ctx.clearRect(0, 0, ITK_W, ITK_H);
  layers.forEach(l => l.draw(ctx));
  if (collect) itkHitRegions = layers.filter(l => l.hit).map(l => l.hit);
}

function itkRedraw() {
  if (!itkCtx) return;
  itkDrawMotif(itkCtx, itkM(), true);

  itkPreviewCanvases.forEach(rec => {
    itkCenterCrop(itkCanvas, rec.fmt.w, rec.fmt.h, rec.canvas);
    const draw = ITK_OVERLAYS[rec.overlay];
    if (draw && itkShowOverlays) draw(rec.canvas.getContext('2d'), rec.fmt.w, rec.fmt.h);
  });
}

function itkCenterCrop(src, tW, tH, dest) {
  const sW = src.width, sH = src.height;
  const tAR = tW / tH, sAR = sW / sH;
  let cropW, cropH;
  if (tAR > sAR) { cropW = sW; cropH = sW / tAR; } else { cropH = sH; cropW = sH * tAR; }
  if (cropW > sW) { cropW = sW; cropH = sW / tAR; }
  if (cropH > sH) { cropH = sH; cropW = sH * tAR; }
  const cropX = (sW - cropW) / 2, cropY = (sH - cropH) / 2;
  const dc = dest.getContext('2d');
  dc.clearRect(0, 0, dest.width, dest.height);
  dc.drawImage(src, cropX, cropY, cropW, cropH, 0, 0, dest.width, dest.height);
}

// ---------------------------------------------------------------------
// 8b. UI-ÜBERLAGERUNGEN für die Widget-Vorschau – unverändert übernommen.
// Sie landen ausschließlich auf den Vorschau-Canvases, nie auf dem
// Master-Canvas, und können den JPG-Export daher nicht erreichen.
// ---------------------------------------------------------------------
const ITK_OV_PINK = '#e5007d';
const ITK_OV_FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const ITK_OV_HEAD = ITK_TEXT.platzhalter.headlineLang;
const ITK_OV_VIEWS = ITK_TEXT.platzhalter.aufrufe, ITK_OV_LIKES = ITK_TEXT.platzhalter.reaktionen,
      ITK_OV_PAGE = ITK_TEXT.platzhalter.seite;
const ITK_OV_NAME  = ITK_TEXT.platzhalter.name;
const ITK_OV_META  = ITK_TEXT.platzhalter.metaVoll;

function itkOvUnit(w, h) { return Math.sqrt(w * h); }
function itkOvScrim(ctx, x, y, w, h, fromTop, strength) {
  const s = strength == null ? 0.88 : strength;
  const g = ctx.createLinearGradient(0, fromTop ? y : y + h, 0, fromTop ? y + h : y);
  g.addColorStop(0, 'rgba(0,0,0,' + s + ')');
  g.addColorStop(0.45, 'rgba(0,0,0,' + (s * 0.45).toFixed(3) + ')');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function itkOvText(ctx, text, x, y, size, weight, align) {
  ctx.font = (weight || 400) + ' ' + size + 'px ' + ITK_OV_FONT;
  ctx.fillStyle = '#ffffff'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}
function itkOvPill(ctx, x, y, w, h) {
  const r = h / 2; ctx.fillStyle = ITK_OV_PINK; ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, -Math.PI / 2);
  ctx.closePath(); ctx.fill();
}
function itkOvCircle(ctx, cx, cy, r) { ctx.fillStyle = ITK_OV_PINK; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
function itkOvIconEye(ctx, x, y, s) {
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.09;
  ctx.beginPath(); ctx.moveTo(x - s * 0.5, y);
  ctx.quadraticCurveTo(x, y - s * 0.46, x + s * 0.5, y);
  ctx.quadraticCurveTo(x, y + s * 0.46, x - s * 0.5, y); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, s * 0.15, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}
function itkOvIconHeart(ctx, x, y, s) {
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.09; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + s * 0.34);
  ctx.bezierCurveTo(x - s * 0.56, y - s * 0.02, x - s * 0.30, y - s * 0.46, x, y - s * 0.14);
  ctx.bezierCurveTo(x + s * 0.30, y - s * 0.46, x + s * 0.56, y - s * 0.02, x, y + s * 0.34);
  ctx.closePath(); ctx.stroke(); ctx.restore();
}
function itkOvIconPause(ctx, x, y, s) {
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.07;
  ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffffff'; const bw = s * 0.085, bh = s * 0.34;
  ctx.fillRect(x - s * 0.155, y - bh / 2, bw, bh);
  ctx.fillRect(x + s * 0.07, y - bh / 2, bw, bh); ctx.restore();
}
function itkOvIconChevron(ctx, x, y, s, dir) {
  ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * 0.13;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const d = s * 0.24 * dir; ctx.beginPath();
  ctx.moveTo(x + d, y - s * 0.30); ctx.lineTo(x - d, y); ctx.lineTo(x + d, y + s * 0.30);
  ctx.stroke(); ctx.restore();
}
function itkOvStatsRow(ctx, y, u, pad) {
  const s = 0.030 * u, ts = 0.026 * u, gap = s * 0.4;
  ctx.font = '400 ' + ts + 'px ' + ITK_OV_FONT;
  let x = pad;
  itkOvIconEye(ctx, x + s / 2, y, s); x += s + gap;
  itkOvText(ctx, ITK_OV_VIEWS, x, y + ts * 0.36, ts, 400);
  x += ctx.measureText(ITK_OV_VIEWS).width + s * 0.85;
  itkOvIconHeart(ctx, x + s / 2, y, s); x += s + gap;
  itkOvText(ctx, ITK_OV_LIKES, x, y + ts * 0.36, ts, 400);
}
function itkOvPlayerRow(ctx, w, y, u, pad) {
  const s = 0.032 * u, ts = 0.026 * u, gap = s * 0.5;
  let x = w - pad;
  itkOvIconChevron(ctx, x - s / 2, y, s, -1); x -= s + gap;
  ctx.font = '400 ' + ts + 'px ' + ITK_OV_FONT;
  const tw = ctx.measureText(ITK_OV_PAGE).width;
  itkOvText(ctx, ITK_OV_PAGE, x, y + ts * 0.36, ts, 400, 'right'); x -= tw + gap;
  itkOvIconChevron(ctx, x - s / 2, y, s, 1); x -= s + gap * 1.4;
  itkOvIconPause(ctx, x - s / 2, y, s);
}
function itkOvClip(ctx, text, maxW, size, weight) {
  ctx.font = (weight || 400) + ' ' + size + 'px ' + ITK_OV_FONT;
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.replace(/\s+$/, '') + '…';
}
function itkOvBanner(ctx, w, h, withAvatar) {
  const u = itkOvUnit(w, h), pad = 0.042 * u;
  itkOvScrim(ctx, 0, 0, w, h * 0.60, true);
  const hs = 0.055 * u, ss = 0.030 * u;
  itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile1, pad, h * 0.19, hs, 700);
  itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile2, pad, h * 0.30, hs, 700);
  itkOvText(ctx, itkOvClip(ctx, ITK_OV_HEAD, w - pad * 2, ss, 400), pad, h * 0.385, ss, 400);
  itkOvText(ctx, ITK_TEXT.platzhalter.datumVeranstaltung, pad, h * 0.455, ss, 400);
  itkOvScrim(ctx, 0, h * 0.62, w, h * 0.38, false);
  const ms = 0.028 * u;
  let tx = pad;
  if (withAvatar) { const r = 0.035 * w; itkOvCircle(ctx, pad + r, h * 0.895, r); tx = pad + r * 2 + pad * 0.6; }
  itkOvText(ctx, ITK_OV_NAME, tx, h * 0.875, ms, 700);
  itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w * 0.55, ms, 400), tx, h * 0.945, ms, 400);
  itkOvPlayerRow(ctx, w, h * 0.905, u, pad);
}

const ITK_OVERLAYS = {
  none: null,
  bottomHeadline(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, h * 0.42, w, h * 0.58, false);
    itkOvText(ctx, ITK_TEXT.platzhalter.missionName, pad, h * 0.70, 0.021 * u, 400);
    const hs = 0.053 * u;
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_HEAD, w - pad * 2, hs, 700), pad, h * 0.80, hs, 700);
    itkOvStatsRow(ctx, h * 0.915, u, pad);
    itkOvPlayerRow(ctx, w, h * 0.915, u, pad);
  },
  tagsTop(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    const pillH = 0.075 * h, gapY = 0.025 * h, padY = 0.04 * h;
    const band = padY * 2 + pillH * 2 + gapY;
    itkOvScrim(ctx, 0, 0, w, band * 1.25, true);
    const pillW = 0.185 * w, gapX = 0.018 * w;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
      itkOvPill(ctx, pad + c * (pillW + gapX), padY + r * (pillH + gapY), pillW, pillH);
    itkOvText(ctx, ITK_TEXT.platzhalter.bereitsGelesen, w - pad, padY + pillH * 0.8, 0.027 * u, 400, 'right');
  },
  smartFeedBig(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.55, true);
    const pillH = 0.062 * h, pillW = 0.15 * w, gapX = 0.017 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.055, pillW, pillH);
    const hs = 0.062 * u;
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile1, pad, h * 0.32, hs, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile2, pad, h * 0.44, hs, 700);
    itkOvScrim(ctx, 0, h * 0.58, w, h * 0.42, false);
    const r = 0.038 * w, tx = pad + r * 2 + pad * 0.6;
    itkOvCircle(ctx, pad + r, h * 0.855, r);
    itkOvText(ctx, ITK_OV_NAME, tx, h * 0.845, 0.026 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w * 0.45, 0.024 * u, 400), tx, h * 0.915, 0.024 * u, 400);
    itkOvStatsRow(ctx, h * 0.88, u, w - pad - 0.20 * u);
  },
  smartFeedMedium(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.50, true);
    const pillH = 0.065 * h, pillW = 0.24 * w, gapX = 0.02 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.06, pillW, pillH);
    const cr = 0.045 * w, hs = 0.055 * u, tx = pad + cr * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + cr, h * 0.265, cr);
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile1, tx, h * 0.28, hs, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile2, tx, h * 0.38, hs, 700);
    itkOvScrim(ctx, 0, h * 0.54, w, h * 0.46, false);
    const r = 0.055 * w, bx = pad + r * 2 + pad * 0.6;
    itkOvCircle(ctx, pad + r, h * 0.845, r);
    itkOvText(ctx, ITK_OV_NAME, bx, h * 0.815, 0.030 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w - bx - pad, 0.028 * u, 400), bx, h * 0.90, 0.028 * u, 400);
  },
  smartFeedSmall(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.05 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.50, true);
    const pillH = 0.09 * h, pillW = 0.26 * w, gapX = 0.03 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.07, pillW, pillH);
    const cr = 0.055 * w, tx = pad + cr * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + cr, h * 0.30, cr);
    itkOvText(ctx, itkOvClip(ctx, ITK_TEXT.platzhalter.headlineZeile1, w - tx - pad, 0.075 * u, 700), tx, h * 0.335, 0.075 * u, 700);
    itkOvScrim(ctx, 0, h * 0.50, w, h * 0.50, false);
    const r = 0.075 * w, bx = pad + r * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + r, h * 0.80, r);
    itkOvText(ctx, ITK_OV_NAME, bx, h * 0.78, 0.070 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_TEXT.platzhalter.metaKurz, w - bx - pad, 0.065 * u, 400), bx, h * 0.90, 0.065 * u, 400);
  },
  bannerTop(ctx, w, h)      { itkOvBanner(ctx, w, h, true); },
  bannerTopPlain(ctx, w, h) { itkOvBanner(ctx, w, h, false); },
  storyCard(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.52, true);
    const hs = 0.058 * u;
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile1, pad, h * 0.215, hs, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile2, pad, h * 0.30, hs, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.datum, pad, h * 0.375, 0.028 * u, 400);
    itkOvScrim(ctx, 0, h * 0.58, w, h * 0.42, false);
    const r = 0.068 * w, tx = pad + r * 2 + pad * 0.7;
    itkOvCircle(ctx, pad + r, h * 0.845, r);
    itkOvText(ctx, ITK_OV_NAME, tx, h * 0.83, 0.030 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w - tx - pad, 0.028 * u, 400), tx, h * 0.895, 0.028 * u, 400);
  },
  microsite(ctx, w, h) {
    const u = itkOvUnit(w, h), pad = 0.045 * u;
    const hs = 0.062 * u, ss = 0.040 * u;
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile1, pad, h * 0.29, hs, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.headlineZeile2, pad, h * 0.40, hs, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_TEXT.platzhalter.headlineMittel, w - pad * 2, ss, 400), pad, h * 0.49, ss, 400);
    itkOvText(ctx, ITK_TEXT.platzhalter.datum, pad, h * 0.575, ss, 400);
    itkOvText(ctx, ITK_OV_NAME, pad, h * 0.735, 0.038 * u, 700);
    itkOvText(ctx, ITK_TEXT.platzhalter.metaKurz, pad, h * 0.815, 0.034 * u, 400);
    itkOvText(ctx, ITK_TEXT.platzhalter.info, pad, h * 0.885, 0.030 * u, 400);
    itkOvStatsRow(ctx, h * 0.92, u, w - pad - 0.22 * u);
  }
};

// ---------------------------------------------------------------------
// 9. BILD LADEN
// ---------------------------------------------------------------------
function itkLoadFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => itkApplyImageSrc(e.target.result, file.name.replace(/\.[^.]+$/, ''));
  reader.readAsDataURL(file);
}

function itkApplyImageSrc(src, name) {
  const img = new Image();
  img.onload = () => {
    const m = itkM();
    // Ein Foto braucht eine Fotofläche – im Kachelmodus läge es unsichtbar
    // unter den Kacheln.
    itkLeaveFullTiles(m);
    m.img = img; m.src = src;
    if (name) m.name = name.slice(0, 22);
    m.x = 0; m.y = 0;
    itkSetZoom(Math.max(ITK_W / img.width, ITK_H / img.height));
    itkDropHint.classList.add('hidden');
    itkCanvas.style.cursor = 'grab';
    if (!m.design.tiles.length) itkRebuildTiles(m, false);
    itkSyncAll();
    itkOpenStep('design');
  };
  img.src = src;
}

/* Die Fläche, die das Foto wirklich ausfüllen muss. Nur was am Ende sichtbar
   bleibt, zählt: Was unter Kacheln liegt, darf das Bild ruhig freilassen –
   sonst ließe sich der Ausschnitt viel weniger weit ziehen, als das Motiv
   eigentlich hergibt. Im Maskenmodus gibt es keine Kacheln, dort bleibt die
   ganze Fläche maßgeblich. */
function itkPhotoTarget(m) {
  const d = m.design;
  if (d.swoosh === 'mask') return { x: 0, y: 0, w: ITK_W, h: ITK_H };
  const area = itkArea(d.areaId);
  return itkRegions(area ? area.split : null, ITK_W, ITK_H, ITK_GAP).photo;
}

/* Kleinstmögliche Zoomstufe: bei ihr deckt das Bild die sichtbare Fläche
   gerade noch vollständig ab. Darunter entstünden weiße Ränder. */
function itkMinScale(m) {
  if (!m.img) return 0.05;
  const r = itkPhotoTarget(m);
  return Math.max(r.w / m.img.width, r.h / m.img.height);
}

/* Zoom und Position so einfangen, dass unter dem Foto nie Hintergrund
   durchscheint. Wer über die Kante hinauszieht, rutscht wieder zurück.
   Das Bild sitzt mittig bei (W/2 + x, H/2 + y); seine Ränder müssen die
   sichtbare Fläche einschließen. */
function itkClampPhoto(m) {
  if (!m.img) return;
  m.scale = Math.max(itkMinScale(m), Math.min(5, m.scale));
  const r = itkPhotoTarget(m);
  const dw = m.img.width * m.scale, dh = m.img.height * m.scale;
  const loX = r.x + r.w - ITK_W / 2 - dw / 2, hiX = r.x - ITK_W / 2 + dw / 2;
  const loY = r.y + r.h - ITK_H / 2 - dh / 2, hiY = r.y - ITK_H / 2 + dh / 2;
  m.x = Math.max(loX, Math.min(hiX, m.x));
  m.y = Math.max(loY, Math.min(hiY, m.y));
}

function itkSetZoom(s) {
  const m = itkM();
  m.scale = Math.max(0.05, Math.min(5, s));
  itkClampPhoto(m);
  const slider = document.getElementById('itk-zoom-slider');
  const label = document.getElementById('itk-zoom-val');
  if (slider) {
    slider.min = Math.round(itkMinScale(m) * 100);
    slider.value = Math.round(m.scale * 100);
  }
  if (label) label.textContent = Math.round(m.scale * 100) + '%';
}

/* Testmotiv: bevorzugt eines der in testmotive.js hinterlegten Bilder,
   zufällig gewählt – aber nie zweimal dasselbe hintereinander, sonst wirkt
   der Knopf beim zweiten Klick wie kaputt. Fehlt die Datei, springt die
   erzeugte Platzhaltergrafik darunter ein, damit das Tutorial nie ins
   Leere läuft. */
let itkLetztesTestmotiv = -1;

function itkDemoImage() {
  const liste = (typeof ITK_TESTMOTIVE !== 'undefined' && ITK_TESTMOTIVE.length)
    ? ITK_TESTMOTIVE : null;
  if (!liste) {
    // Lautlos auf den Platzhalter zurückzufallen sieht aus wie ein Fehler im
    // Werkzeug. Beim Veröffentlichen fehlt die Datei am ehesten, weil sie
    // nicht mit hochgeladen wurde.
    itkToast(ITK_TEXT.bild.fehlendesTestmotivToast);
    return itkDemoFallback();
  }
  let i = Math.floor(Math.random() * liste.length);
  if (liste.length > 1 && i === itkLetztesTestmotiv) i = (i + 1) % liste.length;
  itkLetztesTestmotiv = i;
  return liste[i].src;
}

/* Ersatz, falls testmotive.js fehlt. */
function itkDemoFallback() {
  const c = document.createElement('canvas');
  c.width = ITK_W; c.height = ITK_H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, ITK_W, ITK_H);
  g.addColorStop(0, '#dfe4ea'); g.addColorStop(0.55, '#b9c2cc'); g.addColorStop(1, '#8f9aa6');
  x.fillStyle = g; x.fillRect(0, 0, ITK_W, ITK_H);
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.ellipse(ITK_W * 0.30, ITK_H * 0.62, 260, 190, -0.3, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(40,52,68,0.45)';
  x.beginPath(); x.arc(ITK_W * 0.66, ITK_H * 0.44, 120, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(40,52,68,0.30)';
  x.fillRect(ITK_W * 0.55, ITK_H * 0.60, 300, ITK_H * 0.40);
  x.fillStyle = 'rgba(0,0,0,0.30)';
  x.font = '600 26px ' + ITK_OV_FONT; x.textAlign = 'center';
  x.fillText(ITK_TEXT.bild.platzhalterBeschriftung, ITK_W / 2, ITK_H - 34);
  return c.toDataURL('image/jpeg', 0.9);
}

// ---------------------------------------------------------------------
// 10. AKKORDEON / ENTSCHEIDUNGSBAUM
// Ein Schritt öffnet sich erst, wenn seine Voraussetzung erfüllt ist –
// so steht nie die ganze Optionsflut auf einmal im Raum.
// ---------------------------------------------------------------------
const ITK_STEP_IDS = ['bild', 'design', 'kacheln', 'swoosh', 'vorlagen'];
function itkStepEl(id) { return document.getElementById('itk-step-' + id); }

function itkOpenStep(id) {
  const el = itkStepEl(id);
  if (!el || el.classList.contains('locked')) return;
  ITK_STEP_IDS.forEach(s => itkStepEl(s).classList.toggle('open', s === id));
}

function itkSyncSteps() {
  const m = itkM();
  const d = m.design;
  const hasImg = !!m.img;
  const area = itkArea(d.areaId);
  const tileCount = area && area.split ? d.tiles.length : 0;

  // Ohne Foto, aber im Kachelmodus, geht es genauso weiter – nur die
  // Designposition setzt ein Foto voraus, gegen das sie sich abgrenzt.
  const bereit = hasImg || itkIsFullTiles(d);
  const lock = {
    bild: false,
    design: !hasImg,
    kacheln: !bereit || !area || !area.split,
    swoosh: !bereit || itkSwooshOptionsFor(d).length <= 1,
    vorlagen: false      // Vorlagen lassen sich auch ohne Bild pflegen
  };
  ITK_STEP_IDS.forEach(s => {
    const el = itkStepEl(s);
    el.classList.toggle('locked', lock[s]);
    if (lock[s]) el.classList.remove('open');
  });

  const sub = {
    bild: hasImg ? itkT(ITK_TEXT.bild.unterzeileZoom, { p: Math.round(m.scale * 100) })
                 : (itkIsFullTiles(d) ? ITK_TEXT.bild.unterzeileOhneFoto : ITK_TEXT.bild.unterzeileLeer),
    design: (d.iconKey === 'none' ? ITK_TEXT.icon.unterzeileOhneIcon
                                   : itkT(ITK_TEXT.icon.unterzeilePraefix, { name: itkIconLabel(d.iconKey) })) +
            ' · ' + (area ? area.label : '–'),
    kacheln: area && area.split
      ? tileCount + (tileCount === 1 ? ITK_TEXT.kacheln.unterzeileEinzahl : ITK_TEXT.kacheln.unterzeileMehrzahl)
      : ITK_TEXT.kacheln.unterzeileKeine,
    swoosh: lock.swoosh ? ITK_TEXT.swoosh.unterzeileGesperrt : itkSwooshLabel(d.swoosh),
    vorlagen: itkTemplates.length +
      (itkTemplates.length === 1 ? ITK_TEXT.vorlagen.unterzeileEinzahl : ITK_TEXT.vorlagen.unterzeileMehrzahl)
  };
  ITK_STEP_IDS.forEach(s => {
    document.getElementById('itk-sub-' + s).textContent = sub[s];
    itkStepEl(s).classList.toggle('done', !lock[s]);
  });

  // Der Zufallsbutton sitzt unter dem Vorschaufenster und gehört damit nicht
  // mehr zum Kachel-Reiter – er muss sich hier eigenständig sperren.
  // Zoom betrifft nur ein Foto – ohne eines hat der Regler nichts zu regeln.
  const zoomField = document.getElementById('itk-zoom-field');
  if (zoomField) zoomField.style.display = hasImg ? '' : 'none';

  const rnd = document.getElementById('itk-random-btn');
  if (rnd) rnd.disabled = !bereit || !area || !area.split;

  // Exportknöpfe – die feste Leiste unten und die beiden Sonderformate im
  // Reiter Vorlagen – brauchen alle ein fertiges Motiv.
  document.querySelectorAll('#itk-export-bar button, #itk-download-psd, #itk-download-svg')
    .forEach(b => { b.disabled = !bereit; });
  const cnt = document.getElementById('itk-export-count');
  if (cnt) cnt.textContent = itkMotifs.length > 1
    ? itkT(ITK_TEXT.export.motiveAnzahl, { n: itkMotifs.length })
    : ITK_TEXT.export.standardGroesse;

  // Nie alle Schritte zu lassen – der oberste freigeschaltete bleibt offen.
  if (!ITK_STEP_IDS.some(s => itkStepEl(s).classList.contains('open'))) {
    const first = ITK_STEP_IDS.find(s => !itkStepEl(s).classList.contains('locked'));
    if (first) itkStepEl(first).classList.add('open');
  }
}

function itkIconLabel(key) {
  if (key === 'custom') return itkCustomIconLabel;
  const ic = ITK_ICONS.find(i => i.key === key);
  return ic ? ic.label : key;
}

function itkSwooshLabel(k) { return ITK_TEXT.swoosh.kurzlabel[k] || k; }

// ---------------------------------------------------------------------
// 11. AUSWAHLRASTER: KACHELBEREICHE
// ---------------------------------------------------------------------
function itkAreaThumbHTML(area) {
  if (!area.split) {
    return '<i class="ph" style="left:0;top:0;width:100%;height:100%"></i>';
  }
  const { photo, seeds } = itkRegions(area.split, 100, 100, 3);
  const box = r => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;
  let html = `<i class="ph" style="${box(photo)}"></i>`;
  seeds.forEach(s => { html += `<i class="tl" style="${box(s)}"></i>`; });
  if (area.icon === true) html += '<i class="ic" style="left:41%;top:33%;width:18%;height:34%"></i>';
  return html;
}

function itkBuildAreaGrid() {
  const grid = document.getElementById('itk-area-grid');
  const m = itkM();
  const list = itkAreasFor(m.design);
  grid.innerHTML = '';
  list.forEach(a => {
    const el = document.createElement('div');
    el.className = 'itk-choice' + (a.id === m.design.areaId ? ' active' : '');
    el.innerHTML = `<div class="itk-choice-vis">${itkAreaThumbHTML(a)}</div>
                    <div class="itk-choice-cap">${a.label}</div>`;
    el.title = a.label + (a.min > 1 ? itkT(ITK_TEXT.bereichMindestensHinweis, { n: a.min }) : '');
    el.addEventListener('click', () => itkSelectArea(a.id));
    itkBindHover(el, 'area:' + a.id, mm => itkApplyArea(mm, a.id));
    grid.appendChild(el);
  });
}

/* Wirkung eines Kachelbereichs auf ein Design – getrennt vom Zustandswechsel,
   damit die Hover-Vorschau exakt dasselbe rechnet wie der spätere Klick. */
function itkApplyArea(m, id) {
  const d = m.design, area = itkArea(id);
  d.areaId = id;
  if (!area.split) {
    d.tiles = [];
  } else {
    d.tileCount = Math.max(area.min, Math.min(itkMaxTiles(d), d.tileCount));
    // Mit Text ist der Bereichswechsel keine gestalterische Entscheidung,
    // sondern nur eine andere Zeilenhöhe für dieselbe Kachelaufteilung –
    // Farben und Bilder bleiben deshalb, wie sie waren, statt neu zu würfeln.
    itkRebuildTiles(m, itkMtOn(d));
  }
  if (!itkSwooshOptionsFor(d).includes(d.swoosh)) d.swoosh = 'none';
  itkEnforceSwooshColor(m);
}

function itkSelectArea(id) {
  const m = itkM();
  // Die Aufteilung wird gewürfelt. Lag sie eben schon als Hover-Vorschau auf
  // dem Motiv, wird genau die übernommen – sonst bekäme man beim Klick eine
  // andere Anordnung als die, die man gerade gesehen hat.
  const seen = itkHoverCache['area:' + id];
  if (seen) m.design = JSON.parse(JSON.stringify(seen));
  else itkApplyArea(m, id);
  itkSyncAll();
  // Bewusst kein automatischer Sprung: wer Bereiche durchprobiert, will nicht
  // nach jedem Klick woanders landen. Nur „Keine Kacheln“ ist eine echte
  // Abzweigung – dort geht es beim Swoosh weiter.
  if (!itkArea(id).split) itkOpenStep('swoosh');
}

// ---------------------------------------------------------------------
// 11b. HOVER-VORSCHAU
// Beim Überfahren einer Designoption zeigt das Motiv oben sofort, was ein
// Klick bewirken würde. Die Ausspielformate rechts bleiben auf dem
// bestätigten Stand – sonst flackerte die ganze rechte Spalte bei jeder
// Mausbewegung. Deshalb wird hier nur der Master-Canvas neu gezeichnet,
// ohne Trefferflächen und ohne die Vorschaukacheln.
// ---------------------------------------------------------------------
let itkHoverOn = false;
const itkHoverCache = {};

function itkHoverClear() { Object.keys(itkHoverCache).forEach(k => delete itkHoverCache[k]); }

function itkHoverPreview(key, build) {
  const m = itkM();
  // Ohne Foto gibt es nur dann etwas zu zeigen, wenn Kacheln die Fläche
  // füllen – sonst bliebe die Vorschau weiß.
  if (!m.img && !itkIsFullTiles(m.design)) return;
  if (!itkHoverCache[key]) {
    const real = m.design;
    m.design = JSON.parse(JSON.stringify(real));
    build(m);
    itkHoverCache[key] = m.design;
    m.design = real;
  }
  // Bildlage mitschützen: ein anderer Kachelbereich hat andere Grenzen, sonst
  // zeigte die Vorschau einen weißen Rand, den es nach dem Klick nicht gibt.
  const rD = m.design, rx = m.x, ry = m.y, rs = m.scale;
  m.design = itkHoverCache[key];
  itkClampPhoto(m);
  itkDrawMotif(itkCtx, m, false);
  m.design = rD; m.x = rx; m.y = ry; m.scale = rs;
  itkHoverOn = true;
}

function itkHoverEnd() {
  if (!itkHoverOn) return;
  itkHoverOn = false;
  itkDrawMotif(itkCtx, itkM(), true);   // echter Zustand samt Trefferflächen
}

/* Beide Richtungen sind verzögert – aus unterschiedlichen Gründen:
   Das Einblenden wartet kurz, damit ein schneller Schwenk über die Reihe nicht
   jede Option durchrendert. Das Zurücksetzen wartet länger, damit beim Wandern
   von einer Option zur nächsten nicht kurz der aktuelle Stand aufblitzt – der
   nächste Hover bricht das Zurücksetzen ab, bevor es greift. */
const ITK_HOVER_IN = 90, ITK_HOVER_OUT = 170;
let itkHoverInT = 0, itkHoverOutT = 0;

function itkHoverCancelTimers() {
  clearTimeout(itkHoverInT);  itkHoverInT = 0;
  clearTimeout(itkHoverOutT); itkHoverOutT = 0;
}

/* Hover-Verhalten an ein Bedienelement hängen. */
function itkBindHover(el, key, build) {
  el.addEventListener('mouseenter', () => {
    // Die bereits gewählte Option zeigt nichts Neues – bei den Kachel-
    // bereichen würfelte sie sogar eine andere Aufteilung als die gerade
    // sichtbare. Das sähe aus wie ein Fehler, deshalb gar nicht erst.
    if (el.classList.contains('active')) return;
    clearTimeout(itkHoverOutT); itkHoverOutT = 0;
    clearTimeout(itkHoverInT);
    itkHoverInT = setTimeout(() => { itkHoverInT = 0; itkHoverPreview(key, build); }, ITK_HOVER_IN);
  });
  el.addEventListener('mouseleave', () => {
    clearTimeout(itkHoverInT); itkHoverInT = 0;
    clearTimeout(itkHoverOutT);
    itkHoverOutT = setTimeout(() => { itkHoverOutT = 0; itkHoverEnd(); }, ITK_HOVER_OUT);
  });
}

// ---------------------------------------------------------------------
// 12. AUSWAHLRASTER: SWOOSH
// ---------------------------------------------------------------------
/* Die Vorschaubildchen benutzen denselben Swoosh-Pfad und dieselbe Geometrie
   wie das Rendering – so zeigt die Auswahl wirklich das, was danach auf dem
   Canvas erscheint, statt einer nachgebauten Andeutung. */
const ITK_THUMB_PHOTO = '#8d8d95';   // deckend, damit es auch auf Magenta als Foto liest

function itkSwooshThumbSVG(id, design) {
  // Die Vorschau zeigt die Farben, die diese Variante tatsächlich bekäme –
  // inklusive Regelwerk, damit hier nie eine unzulässige Kombination steht.
  const tileBase = (design.tiles && design.tiles[0]) ? design.tiles[0].color : KBR.navy;
  const SW = id === 'tile' ? kbrFix(design.swooshColor, kbrAllowedOn(tileBase))
           : id === 'mask' ? kbrFix(design.swooshColor, kbrAllowedOn(design.maskBase))
           : kbrFix(design.swooshColor, KBR_SWOOSH_ON_PHOTO);
  const TILE = id === 'tile' ? tileBase : design.maskBase;
  const P = d => '<path d="' + ITK_SWOOSH_D + '" fill="' + d + '"/>';
  const open = '<svg class="itk-choice-svg" viewBox="0 0 ' + ITK_W + ' ' + ITK_H +
               '" xmlns="http://www.w3.org/2000/svg">';
  const photoRect = '<rect width="' + ITK_W + '" height="' + ITK_H + '" fill="' + ITK_THUMB_PHOTO + '"/>';

  if (id === 'none') return open + photoRect + '</svg>';

  if (id === 'photo') {
    const h = ITK_H * 0.76, w = h * (ITK_SWOOSH_VB.w / ITK_SWOOSH_VB.h);
    const s = h / ITK_SWOOSH_VB.h;
    const tx = ITK_W - w - ITK_W * 0.02, ty = (ITK_H - h) / 2;
    return open + photoRect +
      '<g transform="translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) + ') scale(' + s.toFixed(4) + ')">' +
      P(SW) + '</g></svg>';
  }

  if (id === 'tile') {
    const { photo, seeds } = itkRegions({ type: 'right', x: 0.63 }, ITK_W, ITK_H, ITK_GAP);
    const t = seeds[0];
    const s = Math.min(t.w / ITK_SWOOSH_VB.w, t.h / ITK_SWOOSH_VB.h) * 1.35;
    const tx = t.x + (t.w - ITK_SWOOSH_VB.w * s) / 2;
    const ty = t.y + (t.h - ITK_SWOOSH_VB.h * s) / 2;
    return open +
      '<rect x="' + photo.x + '" y="' + photo.y + '" width="' + photo.w + '" height="' + photo.h + '" fill="' + ITK_THUMB_PHOTO + '"/>' +
      '<clipPath id="itkTileClip"><rect x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '"/></clipPath>' +
      '<rect x="' + t.x + '" y="' + t.y + '" width="' + t.w + '" height="' + t.h + '" fill="' + TILE + '"/>' +
      '<g clip-path="url(#itkTileClip)"><g transform="translate(' + tx.toFixed(1) + ',' + ty.toFixed(1) +
      ') scale(' + s.toFixed(4) + ')">' + P(SW) + '</g></g></svg>';
  }

  // mask – dieselben zwei Pfade und Transformationen wie im Rendering
  const k = ITK_MASK;
  return open +
    '<rect width="' + ITK_W + '" height="' + ITK_H + '" fill="' + TILE + '"/>' +
    '<g transform="translate(' + k.edgeX + ',' + k.edgeY + ') scale(' + k.edgeScale + ')">' + P(SW) + '</g>' +
    '<g transform="translate(' + k.photoX + ',' + k.photoY + ')">' +
    '<path d="' + ITK_MASK_PHOTO_D + '" fill="' + ITK_THUMB_PHOTO + '"/></g></svg>';
}

const ITK_SWOOSH_OPTS = [
  { id: 'none',  label: ITK_TEXT.swoosh.optionen.none },
  { id: 'photo', label: ITK_TEXT.swoosh.optionen.photo },
  { id: 'tile',  label: ITK_TEXT.swoosh.optionen.tile },
  { id: 'mask',  label: ITK_TEXT.swoosh.optionen.mask }
];

function itkSwooshOptionsFor(d) {
  // Mit Text ist die Kachel belegt: ein Swoosh läge darunter oder darüber.
  if (itkMtOn(d)) return ['none'];
  const area = itkArea(d.areaId);
  const n = area && area.split ? d.tiles.length : 0;
  const hasIcon = d.iconKey !== 'none';
  // Mit Icon führt der einzige Weg zum Swoosh über eine Hintergrundkachel –
  // „auf Bild“ und „als Maske“ würden sich mit dem mittig sitzenden Icon beißen.
  if (n === 0) return hasIcon ? ['none'] : ['none', 'photo', 'mask'];
  if (n === 1) return ['none', 'tile'];   // eine Kachel: Swoosh darf nur hinein, nicht mehr aufs Bild
  return ['none'];
}

function itkBuildSwooshGrid() {
  const grid = document.getElementById('itk-swoosh-grid');
  const d = itkM().design;
  const allowed = itkSwooshOptionsFor(d);
  grid.innerHTML = '';
  ITK_SWOOSH_OPTS.filter(o => allowed.includes(o.id)).forEach(o => {
    const el = document.createElement('div');
    el.className = 'itk-choice' + (o.id === d.swoosh ? ' active' : '');
    el.innerHTML = `<div class="itk-choice-vis">${itkSwooshThumbSVG(o.id, d)}</div>` +
                   `<div class="itk-choice-cap">${o.label}</div>`;
    el.addEventListener('click', () => {
      d.swoosh = o.id;
      itkEnforceSwooshColor(itkM());
      itkSyncAll();
    });
    itkBindHover(el, 'swoosh:' + o.id, mm => {
      mm.design.swoosh = o.id;
      itkEnforceSwooshColor(mm);
    });
    grid.appendChild(el);
  });
}

/* Farbchips für den Swoosh – die Auswahl richtet sich nach dem Untergrund. */
function itkBuildSwooshChips() {
  const wrap = document.getElementById('itk-swoosh-chips');
  const field = document.getElementById('itk-swoosh-color-field');
  const note = document.getElementById('itk-swoosh-note');
  const m = itkM(), d = m.design;

  if (d.swoosh === 'none') {
    field.style.display = 'none';
    note.textContent = ITK_TEXT.swoosh.hinweisKeinSwoosh;
    return;
  }
  field.style.display = '';

  let allowed, why;
  if (d.swoosh === 'photo') {
    allowed = KBR_SWOOSH_ON_PHOTO;
    why = ITK_TEXT.swoosh.hinweisAufBild;
  } else if (d.swoosh === 'tile') {
    const base = d.tiles[0] ? d.tiles[0].color : KBR.navy;
    allowed = kbrAllowedOn(base);
    why = itkT(ITK_TEXT.swoosh.hinweisInKachel,
      { farbe: KBR_NAMES[base], erlaubt: allowed.map(c => KBR_NAMES[c]).join(' oder ') });
  } else {
    allowed = kbrAllowedOn(d.maskBase);
    why = itkT(ITK_TEXT.swoosh.hinweisAlsMaske,
      { farbe: KBR_NAMES[d.maskBase], erlaubt: allowed.map(c => KBR_NAMES[c]).join(' oder ') });
  }
  d.swooshColor = kbrFix(d.swooshColor, allowed);

  wrap.innerHTML = '';
  allowed.forEach(c => {
    const b = document.createElement('button');
    b.className = 'itk-chip' + (c === d.swooshColor ? ' active' : '');
    b.innerHTML = `<i style="background:${c}"></i>${KBR_NAMES[c]}`;
    b.addEventListener('click', () => { d.swooshColor = c; itkSyncAll(); });
    itkBindHover(b, 'swcol:' + c, mm => { mm.design.swooshColor = c; });
    wrap.appendChild(b);
  });
  note.textContent = why;
}

// ---------------------------------------------------------------------
// 13. FARB-POPUP (Doppelklick auf eine Fläche im Vorschaufenster)
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// 16b. TEXT DIREKT IM MOTIV ÄNDERN
// Über dem Text liegt beim Bearbeiten ein Eingabefeld mit unsichtbarer
// Schrift: Zu sehen ist weiter der Text, den das Canvas darunter bei jedem
// Tastendruck neu zeichnet – sichtbar bleibt nur der Cursor.
// ---------------------------------------------------------------------
let itkMtFontOk = true;

function itkMtEditEl() { return document.getElementById('itk-motiv-text'); }

function itkMtEditOpen() {
  const m = itkM();
  if (!itkMtBlock(m)) return;
  const ta = itkMtEditEl();
  ta.value = m.design.textValue || '';
  ta.style.display = 'block';
  itkMtEditPlace();
  ta.focus();
  ta.select();
}

function itkMtEditPlace() {
  const ta = itkMtEditEl();
  if (ta.style.display === 'none') return;
  const tb = itkMtBlock(itkM());
  if (!tb) return;
  const r = itkCanvas.getBoundingClientRect();
  const k = r.width / ITK_W;                 // Anzeigemaßstab des Motivs
  const c = itkMtMeasureCtx();
  c.font = itkMtFont(tb.fs, tb.cfg);
  const mm = c.measureText('Hg');
  const asc = mm.fontBoundingBoxAscent || tb.fs * 0.9;
  const desc = mm.fontBoundingBoxDescent || tb.fs * 0.25;
  // Oberkante so setzen, dass die erste Grundlinie des Feldes genau auf der
  // Grundlinie im Motiv liegt.
  const top = tb.baselines[0] - ((tb.lh - (asc + desc)) / 2 + asc);
  ta.style.left = itkNum(ITK_MT_BOX.x * k) + 'px';
  ta.style.width = itkNum(ITK_MT_BOX.w * k) + 'px';
  ta.style.top = itkNum(top * k) + 'px';
  ta.style.height = itkNum(tb.lh * tb.lines.length * k) + 'px';
  ta.style.fontSize = itkNum(tb.fs * k) + 'px';
  ta.style.lineHeight = itkNum(tb.lh * k) + 'px';
  ta.style.fontStyle = tb.cfg.italic ? 'italic' : 'normal';
  ta.style.textTransform = tb.cfg.upper ? 'uppercase' : 'none';
  ta.style.textAlign = tb.align;
  ta.style.caretColor = tb.color;
}

function itkMtEditClose() {
  const ta = itkMtEditEl();
  if (ta) ta.style.display = 'none';
}

/* Eine Änderung am Text wirkt sofort: Umbruch, Schriftgröße und – bei zwei
   Zeilen – auch der Kachelbereich. */
function itkMtApplyValue(wert, ausFeld) {
  const m = itkM();
  const sauber = itkMtClamp(m.design, wert);
  const vorher = String(m.design.textValue || '');
  // Eine Eingabe, die die Grenze reißt, wird gar nicht erst angenommen – sonst
  // rutschten die nächsten Zeichen ins vorherige Wort. Nur in ein leeres Feld
  // wird übernommen, was passt; so bleibt Einfügen brauchbar.
  const neu = (sauber === wert || !vorher.trim()) ? sauber : vorher;
  m.design.textValue = neu;
  // Beide Eingabestellen nachziehen. Zurückgenommen wird immer am Ende, die
  // Schreibmarke darf deshalb stehen bleiben, wo sie war.
  [document.getElementById('itk-text-input'), itkMtEditEl()].forEach(el => {
    if (!el || el.value === neu) return;
    const pos = el === ausFeld ? el.selectionStart : null;
    el.value = neu;
    if (pos != null) {
      const p = Math.min(pos, neu.length);
      try { el.setSelectionRange(p, p); } catch (e) { /* unsichtbares Feld */ }
    }
  });
  itkMtEnforceArea(m);
  // Ob ein oder zwei Zeilen: davon hängt ab, welche Kachelbereiche überhaupt
  // zur Wahl stehen – das Raster muss bei jeder Eingabe mitgehen.
  itkBuildAreaGrid();
  itkRedraw();
  itkMtEditPlace();
  itkSyncSteps();
}

/* Die Hausschrift wird nicht mitgeliefert, sondern vom Rechner geholt. Erst
   wenn sie wirklich da ist, stimmen Breitenmessung und Schriftgröße. */
function itkMtLoadFont() {
  if (!document.fonts) return Promise.resolve();
  const proben = ['italic 800 80px "TeleNeo Motiv"', '800 48px "TeleNeo Motiv"'];
  return Promise.all(proben.map(f => document.fonts.load(f, 'Hg')))
    .then(() => {
      itkMtFontOk = proben.every(f => document.fonts.check(f, 'Hg'));
      itkRedraw();
    })
    .catch(() => {});
}

function itkCanvasPoint(e) {
  const r = itkCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (ITK_W / r.width),
           y: (e.clientY - r.top) * (ITK_H / r.height) };
}

function itkHitTest(pt) {
  for (let i = itkHitRegions.length - 1; i >= 0; i--) {
    const h = itkHitRegions[i];
    if (h.mask) {
      // Im Maskenmodus liegen drei Flächen übereinander. Das Foto selbst hat
      // keine Farbe zu wählen – dort soll gar kein Dialog aufgehen. Kante ist
      // der Teil des Swooshs, den das Foto nicht überdeckt, Fläche der Rest.
      itkCtx.save(); itkMaskPhotoTransform(itkCtx);
      const onPhoto = itkCtx.isPointInPath(ITK_MASK_PHOTO_PATH, pt.x, pt.y);
      itkCtx.restore();
      if (onPhoto) continue;
      if (h.kind === 'maskBase') return h;
      itkCtx.save(); itkMaskEdgeTransform(itkCtx);
      const onSwoosh = itkCtx.isPointInPath(ITK_SWOOSH_PATH, pt.x, pt.y);
      itkCtx.restore();
      if (!onSwoosh) continue;
      return h;
    }
    if (h.tile) {
      const t = h.tile;
      if (pt.x < t.x || pt.x > t.x + t.w || pt.y < t.y || pt.y > t.y + t.h) continue;
      itkCtx.save();
      itkSwooshTransform(itkCtx, t, h.swooshFit);
      const on = itkCtx.isPointInPath(ITK_SWOOSH_PATH, pt.x, pt.y);
      itkCtx.restore();
      if (!on) continue;
      return h;
    }
    const r = h.rect;
    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) return h;
  }
  return null;
}

function itkOpenColorPop(hit, e) {
  const m = itkM(), d = m.design;
  const pop = document.getElementById('itk-pop');
  const title = document.getElementById('itk-pop-title');
  const rule = document.getElementById('itk-pop-rule');
  const sw = document.getElementById('itk-pop-swatches');

  let options, current, apply, label, hint, extra = null;

  if (hit.kind === 'tile') {
    options = KBR_PRIMARIES; current = d.tiles[hit.index].color;
    label = ITK_TEXT.popup.kachelfarbeLabel;
    hint = ITK_TEXT.popup.kachelfarbeHinweis;
    apply = c => { d.tiles[hit.index].color = c; d.tiles[hit.index].src = null;
                   itkEnforceSwooshColor(m); };
    // Bilder in einzelnen Kacheln gibt es nur im Modus ohne Foto – sonst
    // konkurrierten sie mit dem Motiv darunter. Und selbst dort nur bis zu
    // einer Höchstzahl, sonst bleibt vom eigentlichen Kachel-Look nichts übrig.
    if (itkIsFullTiles(d)) {
      const hasImg = !!d.tiles[hit.index].src;
      const max = itkMaxTileImages(d.tiles.length);
      const belegt = d.tiles.filter((t, i) => i !== hit.index && t.src).length;
      const frei = hasImg || belegt < max;
      if (frei) {
        extra = { hasImg, index: hit.index };
        hint = hasImg ? ITK_TEXT.popup.kachelBildErsetzenHinweis : ITK_TEXT.popup.kachelOderBildHinweis;
      } else {
        hint = max === 1 ? ITK_TEXT.popup.kachelBildLimitHinweisEinzahl
                          : itkT(ITK_TEXT.popup.kachelBildLimitHinweisMehrzahl, { n: max });
      }
    }
  } else if (hit.kind === 'icon') {
    options = KBR_PRIMARIES; current = d.iconBg;
    label = ITK_TEXT.popup.iconFlaecheLabel;
    hint = ITK_TEXT.popup.iconFlaecheHinweis;
    apply = c => { d.iconBg = c; d.iconFg = kbrAllowedOn(c)[0]; };
  } else if (hit.kind === 'maskBase') {
    options = KBR_PRIMARIES; current = d.maskBase;
    label = ITK_TEXT.popup.maskenflaecheLabel;
    hint = ITK_TEXT.popup.maskenflaecheHinweis;
    apply = c => { d.maskBase = c; d.swooshColor = kbrFix(d.swooshColor, kbrAllowedOn(c)); };
  } else if (hit.kind === 'maskEdge') {
    options = kbrAllowedOn(d.maskBase); current = d.swooshColor;
    label = ITK_TEXT.popup.maskenkanteLabel;
    hint = itkT(ITK_TEXT.popup.zulaessigAuf, { farbe: KBR_NAMES[d.maskBase] });
    apply = c => { d.swooshColor = c; };
  } else if (hit.kind === 'swooshTile') {
    const base = d.tiles[0] ? d.tiles[0].color : KBR.navy;
    options = kbrAllowedOn(base); current = d.swooshColor;
    label = ITK_TEXT.popup.swooshInKachelLabel;
    hint = itkT(ITK_TEXT.popup.zulaessigAuf, { farbe: KBR_NAMES[base] });
    apply = c => { d.swooshColor = c; };
  } else if (hit.kind === 'swooshPhoto') {
    options = KBR_SWOOSH_ON_PHOTO; current = d.swooshColor;
    label = ITK_TEXT.popup.swooshAufBildLabel;
    hint = ITK_TEXT.popup.swooshAufBildHinweis;
    apply = c => { d.swooshColor = c; };
  } else return;

  title.textContent = label;
  rule.textContent = hint;
  const act = document.getElementById('itk-pop-actions');
  act.innerHTML = '';
  act.style.display = extra ? '' : 'none';
  if (extra) {
    const pick = document.createElement('button');
    pick.className = 'ctrl-btn';
    pick.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18"/>' +
      '<circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
      (extra.hasImg ? ITK_TEXT.popup.bildTauschenBtn : ITK_TEXT.popup.bildEinsetzenBtn);
    pick.addEventListener('click', () => {
      itkTileTarget = extra.index;
      document.getElementById('itk-tile-file-input').click();
      itkClosePop();
    });
    act.appendChild(pick);
    if (extra.hasImg) {
      const del = document.createElement('button');
      del.className = 'icon-btn'; del.title = ITK_TEXT.popup.bildEntfernenTitel;
      del.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
        'stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/>' +
        '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';
      del.addEventListener('click', () => {
        d.tiles[extra.index].src = null; itkClosePop(); itkSyncAll();
      });
      act.appendChild(del);
    }
  }
  sw.innerHTML = '';
  options.forEach(c => {
    const b = document.createElement('button');
    b.className = 'itk-pop-sw' + (c === current ? ' active' : '');
    b.style.background = c;
    b.title = KBR_NAMES[c];
    b.addEventListener('click', () => { apply(c); itkClosePop(); itkSyncAll(); });
    sw.appendChild(b);
  });

  pop.classList.add('show');
  pop.style.left = e.clientX + 'px';
  pop.style.top = e.clientY + 'px';
  requestAnimationFrame(() => {
    const r = pop.getBoundingClientRect();
    if (r.right > innerWidth) pop.style.left = (innerWidth - r.width - 10) + 'px';
    if (r.bottom > innerHeight) pop.style.top = (innerHeight - r.height - 10) + 'px';
  });
  itkPopTarget = hit;
}
function itkClosePop() {
  document.getElementById('itk-pop').classList.remove('show');
  itkPopTarget = null;
}

// ---------------------------------------------------------------------
// 14. MOTIVE
// ---------------------------------------------------------------------
/* Motive erscheinen als nummerierte Seiten-Symbole unter dem Vorschaufenster.
   Bewusst keine Miniaturbilder: die Vorschau darüber zeigt ohnehin das aktive
   Motiv, und mehrere Kleinstbilder nebeneinander lesen sich schlechter als
   eine schlichte Seitenzählung. */
const ITK_PAGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">' +
  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>';

function itkBuildMotifs() {
  const wrap = document.getElementById('itk-motifs');
  wrap.innerHTML = '';
  itkMotifs.forEach((m, i) => {
    const el = document.createElement('div');
    el.className = 'itk-page' + (m.id === itkActiveId ? ' active' : '');
    el.title = itkT(ITK_TEXT.motive.seiteTitel, { n: i + 1 }) + (m.img ? '' : ITK_TEXT.motive.seiteOhneBildZusatz);
    el.innerHTML = ITK_PAGE_SVG + '<span class="itk-page-no">' + (i + 1) + '</span>';
    el.addEventListener('click', () => itkSelectMotif(m.id));
    if (itkMotifs.length > 1) {
      const del = document.createElement('span');
      del.className = 'itk-page-del'; del.textContent = '×'; del.title = ITK_TEXT.motive.entfernenTitel;
      del.addEventListener('click', ev => { ev.stopPropagation(); itkRemoveMotif(m.id); });
      el.appendChild(del);
    }
    wrap.appendChild(el);
  });

  const add = document.createElement('button');
  add.className = 'itk-page-add'; add.title = ITK_TEXT.motive.hinzufuegenTitel;
  add.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', itkAddMotif);
  wrap.appendChild(add);
}

function itkAddMotif() {
  // Neues Motiv erbt das Design des aktuellen – in der Praxis will man
  // meist dieselbe Gestaltung mit einem anderen Bild.
  const cur = itkM();
  const m = itkNewMotif(itkT(ITK_TEXT.motive.standardname, { n: itkMotifs.length + 1 }));
  m.design = JSON.parse(JSON.stringify(cur.design));
  itkMotifs.push(m);
  itkActiveId = m.id;
  itkBuildMotifs();
  itkSyncAll();
  itkOpenStep('bild');
  itkToast(ITK_TEXT.motive.angelegtToast);
}

function itkRemoveMotif(id) {
  if (itkMotifs.length <= 1) return;
  const i = itkMotifs.findIndex(m => m.id === id);
  itkMotifs.splice(i, 1);
  if (itkActiveId === id) itkActiveId = itkMotifs[Math.max(0, i - 1)].id;
  itkBuildMotifs();
  itkSyncAll();
}

function itkSelectMotif(id) {
  itkActiveId = id;
  const m = itkM();
  itkSyncDropHint();
  itkSetZoom(m.scale);
  itkBuildMotifs();
  itkSyncAll();
}

// ---------------------------------------------------------------------
// 15. VORLAGEN
// Gespeichert wird nur das Design, nie das Bild – genau darum lässt sich
// eine Vorlage auf beliebige Motive anwenden.
// ---------------------------------------------------------------------
const ITK_TPL_KEY = 'kbr_itk_templates_v1';

function itkLoadTemplates() {
  try { itkTemplates = JSON.parse(localStorage.getItem(ITK_TPL_KEY) || '[]'); }
  catch (e) { itkTemplates = []; }
}
function itkStoreTemplates() {
  try { localStorage.setItem(ITK_TPL_KEY, JSON.stringify(itkTemplates)); }
  catch (e) { itkToast(ITK_TEXT.vorlagen.nichtGespeichertToast); }
}

function itkSaveTemplate() {
  const input = document.getElementById('itk-tpl-name');
  const name = (input.value || '').trim() || itkT(ITK_TEXT.vorlagen.standardname, { n: itkTemplates.length + 1 });
  const d = JSON.parse(JSON.stringify(itkM().design));
  // Eingesetzte Kachelbilder bleiben draußen: eine Data-URL je Kachel würde
  // den Speicher des Browsers sprengen, und eine Vorlage beschreibt ohnehin
  // die Gestaltung, nicht das Bildmaterial.
  if (d.tiles) d.tiles.forEach(t => { t.src = null; });
  const existing = itkTemplates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
  const rec = { id: 't' + Date.now().toString(36), name, design: d };
  if (existing >= 0) itkTemplates[existing] = rec; else itkTemplates.push(rec);
  itkStoreTemplates();
  input.value = '';
  itkBuildTemplates();
  itkSyncSteps();
  itkToast(existing >= 0 ? itkT(ITK_TEXT.vorlagen.aktualisiertToast, { name })
                        : itkT(ITK_TEXT.vorlagen.gesichertToast, { name }));
}

function itkApplyTemplate(id) {
  const t = itkTemplates.find(x => x.id === id);
  if (!t) return;
  const m = itkM();
  m.design = JSON.parse(JSON.stringify(t.design));
  if (!itkSwooshOptionsFor(m.design).includes(m.design.swoosh)) m.design.swoosh = 'none';
  itkEnforceSwooshColor(m);
  itkSyncAll();
  itkToast(itkT(ITK_TEXT.vorlagen.angewendetToast, { name: t.name }));
}

/* Umbenennen an Ort und Stelle: der Name wird zum Eingabefeld, Enter oder
   Verlassen des Feldes übernimmt, Escape verwirft. */
function itkRenameTemplate(id, nameEl) {
  const t = itkTemplates.find(x => x.id === id);
  if (!t) return;
  const input = document.createElement('input');
  input.className = 'itk-input itk-tpl-rename';
  input.value = t.name;
  input.maxLength = 40;
  nameEl.replaceWith(input);
  input.focus();
  input.select();

  let closed = false;
  const commit = save => {
    if (closed) return;
    closed = true;
    if (save) {
      const v = input.value.trim();
      if (v) { t.name = v; itkStoreTemplates(); }
    }
    itkBuildTemplates();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') commit(true);
    if (e.key === 'Escape') commit(false);
  });
  input.addEventListener('blur', () => commit(true));
}

function itkDeleteTemplate(id) {
  itkTemplates = itkTemplates.filter(t => t.id !== id);
  itkStoreTemplates();
  itkBuildTemplates();
  itkSyncSteps();
}

function itkTplThumbHTML(design) {
  const area = itkArea(design.areaId);
  if (!area || !area.split) {
    return design.swoosh === 'mask'
      ? `<i style="left:0;top:0;width:100%;height:100%;background:${design.maskBase}"></i>
         <i style="left:-5%;top:26%;width:110%;height:48%;background:${design.swooshColor};transform:rotate(-10deg)"></i>`
      : '<i style="left:0;top:0;width:100%;height:100%;background:rgba(255,255,255,.2)"></i>';
  }
  const { photo } = itkRegions(area.split, 100, 100, 3);
  const box = r => `left:${r.x}%;top:${r.y}%;width:${r.w}%;height:${r.h}%`;
  let html = `<i style="${box(photo)};background:rgba(255,255,255,.2)"></i>`;
  (design.tiles || []).forEach(t => {
    html += `<i style="left:${t.x / ITK_W * 100}%;top:${t.y / ITK_H * 100}%;` +
            `width:${t.w / ITK_W * 100}%;height:${t.h / ITK_H * 100}%;background:${t.color}"></i>`;
  });
  if (design.iconKey !== 'none')
    html += `<i style="left:42%;top:34%;width:16%;height:32%;background:${design.iconBg};box-shadow:0 0 0 1px #fff"></i>`;
  return html;
}

function itkBuildTemplates() {
  const list = document.getElementById('itk-tpl-list');
  list.innerHTML = '';
  if (!itkTemplates.length) {
    list.innerHTML = '<div class="itk-tpl-empty">' + itkXmlAttr(ITK_TEXT.vorlagen.leerHinweis) + '</div>';
    return;
  }
  itkTemplates.forEach(t => {
    const area = itkArea(t.design.areaId);
    const n = t.design.tiles ? t.design.tiles.length : 0;
    const meta = [
      area ? area.label : '–',
      n ? n + ITK_TEXT.vorlagen.kachelnMehrzahl : ITK_TEXT.vorlagen.ohneKacheln,
      t.design.iconKey !== 'none' ? ITK_TEXT.vorlagen.iconVorhanden : null,
      t.design.swoosh !== 'none' ? ITK_TEXT.vorlagen.swooshPraefix + itkSwooshLabel(t.design.swoosh) : null
    ].filter(Boolean).join(' · ');

    const el = document.createElement('div');
    el.className = 'itk-tpl';
    const vis = document.createElement('div');
    vis.className = 'itk-tpl-vis';
    vis.innerHTML = itkTplThumbHTML(t.design);
    const text = document.createElement('div');
    text.style.cssText = 'flex:1;min-width:0';
    const nameEl = document.createElement('div');
    nameEl.className = 'itk-tpl-name';
    nameEl.textContent = t.name;
    const metaEl = document.createElement('div');
    metaEl.className = 'itk-tpl-meta';
    metaEl.textContent = meta;
    text.appendChild(nameEl); text.appendChild(metaEl);
    el.appendChild(vis); el.appendChild(text);

    const actions = document.createElement('div');
    actions.className = 'itk-tpl-actions';
    const mkBtn = (title, svg, fn) => {
      const b = document.createElement('button');
      b.className = 'icon-btn'; b.title = title; b.innerHTML = svg;
      b.addEventListener('click', fn);
      actions.appendChild(b);
    };
    mkBtn(ITK_TEXT.vorlagen.anwendenTitel,
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      () => itkApplyTemplate(t.id));
    mkBtn(ITK_TEXT.vorlagen.umbenennenTitel,
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
      () => itkRenameTemplate(t.id, nameEl));
    mkBtn(ITK_TEXT.vorlagen.loeschenTitel,
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
      () => itkDeleteTemplate(t.id));

    itkBindHover(el, 'tpl:' + t.id, mm => {
      mm.design = JSON.parse(JSON.stringify(t.design));
      itkEnforceSwooshColor(mm);
    });
    el.appendChild(actions);
    list.appendChild(el);
  });
}

// ---------------------------------------------------------------------
// 16. VORSCHAU-SPALTE – unverändert übernommen
// ---------------------------------------------------------------------
function itkMakePreviewCard(fmt, overlay, note) {
  const item = document.createElement('div');
  item.className = 'itk-preview-item';
  const c = document.createElement('canvas');
  c.width = fmt.w; c.height = fmt.h;
  c.style.width = Math.round(fmt.w * fmt.scale) + 'px';
  c.style.height = Math.round(fmt.h * fmt.scale) + 'px';
  const nm = document.createElement('div');
  nm.className = 'itk-preview-name'; nm.textContent = fmt.name;
  const sz = document.createElement('div');
  sz.className = 'itk-preview-size'; sz.textContent = fmt.w + ' × ' + fmt.h + ' px';
  item.appendChild(c); item.appendChild(nm); item.appendChild(sz);
  if (note) {
    const nt = document.createElement('div');
    nt.className = 'itk-preview-note'; nt.textContent = note;
    item.appendChild(nt);
  }
  itkPreviewCanvases.push({ canvas: c, fmt, overlay });
  return item;
}

function itkBuildPreviewGrid() {
  const gridMain = document.getElementById('itk-preview-grid-main');
  const gridMore = document.getElementById('itk-preview-grid-more');
  const viewDefault = document.getElementById('itk-preview-default');
  const viewWidget = document.getElementById('itk-preview-widget');
  if (!gridMain || !gridMore) return;

  itkPreviewCanvases = [];
  gridMain.innerHTML = ''; gridMore.innerHTML = ''; viewWidget.innerHTML = '';

  const widget = ITK_WIDGETS.find(x => x.key === itkWidget);
  viewDefault.style.display = widget ? 'none' : '';
  viewWidget.style.display = widget ? '' : 'none';

  if (!widget) {
    ITK_FORMATS.forEach(fmt => {
      const card = itkMakePreviewCard(fmt, 'none', null);
      (fmt.group === 'main' ? gridMain : gridMore).appendChild(card);
    });
    return;
  }
  widget.rows.forEach(row => {
    const section = document.createElement('div');
    section.className = 'itk-preview-row';
    const label = document.createElement('div');
    label.className = 'itk-preview-group-label';
    label.textContent = 'Grid ' + row.grid;
    const grid = document.createElement('div');
    grid.className = 'itk-preview-grid';
    row.slots.forEach(slot => {
      const fmt = itkFormatByName(slot.format);
      if (fmt) grid.appendChild(itkMakePreviewCard(fmt, slot.overlay, slot.note));
    });
    section.appendChild(label); section.appendChild(grid);
    viewWidget.appendChild(section);
  });
}

// ---------------------------------------------------------------------
// 17. CANVAS-INTERAKTION
// ---------------------------------------------------------------------
function itkInitCanvasInteraction() {
  itkStage.addEventListener('dragover', e => { e.preventDefault(); itkStage.classList.add('dragover'); });
  itkStage.addEventListener('dragleave', () => itkStage.classList.remove('dragover'));
  itkStage.addEventListener('drop', e => {
    e.preventDefault(); itkStage.classList.remove('dragover');
    itkLoadFile(e.dataTransfer.files[0]);
  });

  itkCanvas.addEventListener('dblclick', e => {
    const hit = itkHitTest(itkCanvasPoint(e));
    itkClosePop();
    // Auf dem Text wird getippt, nicht gefärbt. Auf dem Logo gibt es nichts
    // zu wählen – es steht immer weiß auf Magenta.
    if (hit && hit.kind === 'motivText') { itkMtEditOpen(); return; }
    if (hit && hit.kind === 'logo') return;
    if (hit) itkOpenColorPop(hit, e);
  });

  itkCanvas.addEventListener('mousedown', e => {
    if (e.button !== 0 || !itkM().img) return;
    itkDragging = true;
    itkDragSX = e.clientX; itkDragSY = e.clientY;
    itkDragIX = itkM().x; itkDragIY = itkM().y;
    itkCanvas.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!itkDragging) return;
    const rect = itkCanvas.getBoundingClientRect();
    const f = ITK_W / rect.width;
    const m = itkM();
    m.x = itkDragIX + (e.clientX - itkDragSX) * f;
    m.y = itkDragIY + (e.clientY - itkDragSY) * f;
    itkClampPhoto(m);
    itkRedraw();
  });
  window.addEventListener('mouseup', () => {
    itkDragging = false;
    itkCanvas.style.cursor = itkM().img ? 'grab' : 'crosshair';
  });

  itkCanvas.addEventListener('wheel', e => {
    if (!itkM().img) return;
    e.preventDefault();
    itkSetZoom(itkM().scale * (e.deltaY > 0 ? 0.92 : 1.09));
    itkRedraw();
    itkSyncSteps();
  }, { passive: false });

  itkCanvas.addEventListener('touchstart', e => {
    const m = itkM();
    if (e.touches.length === 1 && m.img) {
      itkDragging = true;
      itkDragSX = e.touches[0].clientX; itkDragSY = e.touches[0].clientY;
      itkDragIX = m.x; itkDragIY = m.y;
    } else if (e.touches.length === 2) {
      itkDragging = false;
      itkPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                                e.touches[0].clientY - e.touches[1].clientY);
      itkPinchScale = m.scale;
    }
    e.preventDefault();
  }, { passive: false });
  itkCanvas.addEventListener('touchmove', e => {
    const m = itkM();
    if (e.touches.length === 1 && itkDragging) {
      const rect = itkCanvas.getBoundingClientRect();
      const f = ITK_W / rect.width;
      m.x = itkDragIX + (e.touches[0].clientX - itkDragSX) * f;
      m.y = itkDragIY + (e.touches[0].clientY - itkDragSY) * f;
      itkClampPhoto(m);
      itkRedraw();
    } else if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      itkSetZoom(itkPinchScale * d / itkPinchDist);
      itkRedraw();
    }
    e.preventDefault();
  }, { passive: false });
  itkCanvas.addEventListener('touchend', () => { itkDragging = false; });

  document.addEventListener('mousedown', e => {
    const pop = document.getElementById('itk-pop');
    if (pop.classList.contains('show') && !pop.contains(e.target)) itkClosePop();
  });
}

// ---------------------------------------------------------------------
// 18. CONTROLS
// ---------------------------------------------------------------------
function itkInitControls() {
  document.querySelectorAll('.itk-step-head').forEach(h => {
    h.addEventListener('click', () => {
      const id = h.dataset.step;
      const el = itkStepEl(id);
      if (el.classList.contains('locked')) return;
      if (el.classList.contains('open')) el.classList.remove('open');
      else itkOpenStep(id);
    });
  });

  document.getElementById('itk-upload-btn').addEventListener('click',
    () => document.getElementById('itk-file-input').click());
  document.getElementById('itk-file-input').addEventListener('change', e => {
    itkLoadFile(e.target.files[0]); e.target.value = '';
  });
  document.getElementById('itk-demo-btn').addEventListener('click',
    () => itkApplyImageSrc(itkDemoImage(), itkM().name));

  /* Ohne Foto: die ganze Fläche wird zum Kachelbereich. Direkt weiter zum
     Reiter Kacheln, denn die Anzahl ist dort die einzige offene Frage. */
  document.getElementById('itk-nophoto-btn').addEventListener('click', () => {
    const m = itkM();
    m.img = null; m.src = null; m.x = 0; m.y = 0;
    document.getElementById('itk-zoom-slider').min = 5;
    itkSetZoom(1);
    m.design.iconKey = 'none';
    // Text braucht eine der beiden unteren Kacheln als Trägerfläche – die
    // gibt es im Modus „Nur Kacheln“ nicht mehr.
    m.design.textMode = 'none';
    if (!itkIsFullTiles(m.design)) m.design.areaBeforeFull = m.design.areaId;
    itkApplyArea(m, 'full');
    itkSyncAll();
    itkOpenStep('kacheln');
    itkToast(ITK_TEXT.kacheln.keinBildEingesetztToast);
  });

  document.getElementById('itk-tile-file-input').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/') || itkTileTarget < 0) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const t = itkM().design.tiles[itkTileTarget];
      itkTileTarget = -1;
      if (!t) return;
      t.src = ev.target.result;
      itkTileImage(t.src);          // Laden anstoßen, itkRedraw folgt von selbst
      itkSyncAll();
      itkToast(ITK_TEXT.kacheln.bildGesetztToast);
    };
    reader.readAsDataURL(file);
  });

  /* „Entfernen“ ist zugleich der Ausstieg aus dem Kachelmodus: es führt in
     jedem Fall in den leeren Ausgangszustand zurück, in dem ein Bild
     erwartet wird. */
  document.getElementById('itk-remove-btn').addEventListener('click', () => {
    const m = itkM();
    itkLeaveFullTiles(m);
    m.img = null; m.src = null; m.x = 0; m.y = 0;
    document.getElementById('itk-zoom-slider').min = 5;
    itkSetZoom(1);
    itkCanvas.style.cursor = 'crosshair';
    itkSyncAll();
    itkOpenStep('bild');
  });

  const zoom = document.getElementById('itk-zoom-slider');
  zoom.addEventListener('input', () => {
    itkSetZoom(zoom.value / 100);
    itkRedraw();
  });
  zoom.addEventListener('change', itkSyncSteps);

  document.getElementById('itk-fill-btn').addEventListener('click', () => {
    const m = itkM(); if (!m.img) return;
    itkSetZoom(Math.max(ITK_W / m.img.width, ITK_H / m.img.height));
    m.x = 0; m.y = 0; itkRedraw(); itkSyncSteps();
  });
  document.getElementById('itk-center-btn').addEventListener('click', () => {
    const m = itkM(); m.x = 0; m.y = 0; itkClampPhoto(m); itkRedraw();
  });

  const iconSel = document.getElementById('itk-icon-select');
  iconSel.addEventListener('change', () => {
    if (iconSel.value === '__upload__') {
      document.getElementById('itk-icon-file-input').click();
      iconSel.value = itkM().design.iconKey;
      return;
    }
    itkSelectIcon(iconSel.value);
  });

  const textSel = document.getElementById('itk-text-select');
  textSel.addEventListener('change', () => itkSelectTextMode(textSel.value));

  const textInput = document.getElementById('itk-text-input');
  textInput.addEventListener('input', () => itkMtApplyValue(textInput.value, textInput));

  const textArea = itkMtEditEl();
  textArea.addEventListener('input', () => {
    // Zeilenumbrüche entstehen aus der Breite, nicht aus der Eingabe.
    itkMtApplyValue(textArea.value.replace(/\n/g, ' '), textArea);
  });
  textArea.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); textArea.blur(); }
  });
  textArea.addEventListener('blur', () => { itkMtEditClose(); itkSyncAll(); });
  window.addEventListener('resize', itkMtEditPlace);
  document.getElementById('itk-icon-file-input').addEventListener('change', e => {
    itkHandleIconUpload(e.target.files[0]); e.target.value = '';
  });

  const tiles = document.getElementById('itk-tiles-slider');
  tiles.addEventListener('input', () => {
    const m = itkM();
    m.design.tileCount = +tiles.value;
    document.getElementById('itk-tiles-val').textContent = tiles.value;
    itkRebuildTiles(m, true);
    if (!itkSwooshOptionsFor(m.design).includes(m.design.swoosh)) m.design.swoosh = 'none';
    itkEnforceSwooshColor(m);
    itkSyncAll();
  });
  document.getElementById('itk-random-btn').addEventListener('click', () => {
    const m = itkM();
    itkRebuildTiles(m, false);
    itkSyncAll();
    itkToast(ITK_TEXT.kacheln.gewuerfeltToast);
  });

  document.getElementById('itk-tpl-save').addEventListener('click', itkSaveTemplate);
  document.getElementById('itk-tpl-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') itkSaveTemplate();
  });

  const widgetSel = document.getElementById('itk-widget-select');
  const overlayCb = document.getElementById('itk-overlay-toggle');
  const syncOverlayToggle = () => {
    const off = itkWidget === 'none';
    overlayCb.disabled = off;
    document.getElementById('itk-overlay-wrap').classList.toggle('disabled', off);
  };
  widgetSel.addEventListener('change', () => {
    itkWidget = widgetSel.value;
    syncOverlayToggle(); itkBuildPreviewGrid(); itkRedraw();
  });
  overlayCb.addEventListener('change', () => { itkShowOverlays = overlayCb.checked; itkRedraw(); });
  syncOverlayToggle();

  document.getElementById('itk-download').addEventListener('click', () => itkExport(itkM()));
  document.getElementById('itk-download-psd').addEventListener('click', () => itkExportPSD(itkM()));
  document.getElementById('itk-download-svg').addEventListener('click', () => itkExportSVG(itkM()));
  document.getElementById('itk-download-all').addEventListener('click', () => {
    itkMotifs.filter(m => m.img).forEach((m, i) => setTimeout(() => itkExport(m), i * 350));
  });

  document.getElementById('itk-tutorial-btn').addEventListener('click', () => itkTutStart(0));
}

/* Textart wählen. Icon und Text schließen sich aus, und der Text braucht
   einen der beiden unteren Kachelbereiche. */
function itkSelectTextMode(mode) {
  const m = itkM(), d = m.design;
  const vorher = d.textMode;
  d.textMode = mode;
  if (itkMtOn(d)) {
    d.iconKey = 'none';
    const vorgabe = mode === 'schlagwort' ? ITK_TEXT.text.vorgabeSchlagwort
                                          : ITK_TEXT.text.vorgabeZweizeiler;
    // Eigene Eingaben überleben den Wechsel der Textart, Vorgaben nicht.
    const alt = String(d.textValue || '').trim();
    if (!alt || alt === ITK_TEXT.text.vorgabeSchlagwort || alt === ITK_TEXT.text.vorgabeZweizeiler) {
      d.textValue = vorgabe;
    }
    // Ein übernommener Text kann für die neue Textart zu lang sein.
    d.textValue = itkMtClamp(d, d.textValue);
    d.tileCount = Math.max(1, Math.min(ITK_MT_MAX_TILES, d.tileCount));
    itkApplyArea(m, d.areaId === 'bottom-l' ? 'bottom-l' : 'bottom-s');
    itkMtEnforceArea(m);
    if (!itkMtFontOk) itkToast(ITK_TEXT.text.fehltSchriftToast);
  } else if (vorher !== 'none') {
    itkMtEditClose();
  }
  itkSyncAll();
}

function itkSelectIcon(key) {
  const m = itkM(), d = m.design;
  const had = d.iconKey !== 'none';
  d.iconKey = key;
  const has = key !== 'none';
  if (has) d.textMode = 'none';
  document.getElementById('itk-icon-note').style.display = has ? '' : 'none';

  // Der Wechsel Icon/kein Icon tauscht die Menge der erlaubten Bereiche.
  if (had !== has) {
    const area = itkArea(d.areaId);
    if (area && area.split) {
      const map = has
        ? { 'left': 'icon-left', 'right': 'icon-right', 'bottom-s': 'icon-bottom',
            'bottom-l': 'icon-bottom', 'l-right': 'icon-right', 'l-left': 'icon-left' }
        : { 'icon-left': 'left', 'icon-right': 'right', 'icon-bottom': 'bottom-l' };
      d.areaId = map[d.areaId] || (has ? 'icon-right' : 'right');
      const na = itkArea(d.areaId);
      d.tileCount = Math.max(na.min, Math.min(5, d.tileCount));
      itkRebuildTiles(m, false);
    }
  }
  if (!itkSwooshOptionsFor(d).includes(d.swoosh)) d.swoosh = 'none';
  itkEnforceSwooshColor(m);
  itkSyncAll();
}

async function itkHandleIconUpload(file) {
  const sel = document.getElementById('itk-icon-select');
  if (!file) return;
  if (file.size > ITK_ICON_MAX_BYTES) { itkToast(ITK_TEXT.icon.zuGrossToast); return; }
  if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
    itkToast(ITK_TEXT.icon.falscherTypToast); return;
  }
  const clean = itkSanitizeIconSVG(await file.text());
  if (!clean) { itkToast(ITK_TEXT.icon.unlesbarToast); return; }
  itkIconSrc.custom = clean;
  Object.keys(itkIconCache).forEach(k => { if (k.startsWith('custom|')) delete itkIconCache[k]; });
  itkCustomIconLabel = file.name.replace(/\.svg$/i, '').slice(0, 24);

  let opt = sel.querySelector('option[value="custom"]');
  if (!opt) {
    opt = document.createElement('option');
    opt.value = 'custom';
    sel.insertBefore(opt, sel.querySelector('option[value="__upload__"]'));
  }
  opt.textContent = itkT(ITK_TEXT.icon.eigenesPraefix, { name: itkCustomIconLabel });
  sel.value = 'custom';
  itkSelectIcon('custom');
  itkToast(itkT(ITK_TEXT.icon.hochgeladenToast, { name: itkCustomIconLabel }));
}

function itkExportName(m) {
  return ITK_TEXT.export.dateiPraefix + m.name.replace(/[^\w\-]+/g, '_');
}

/* Blob-Downloads brauchen den Anker im Dokument, bevor click() greift –
   anders als der Data-URL-Download beim JPG. */
function itkDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function itkExport(m) {
  const c = document.createElement('canvas');
  c.width = ITK_W; c.height = ITK_H;
  itkDrawMotif(c.getContext('2d'), m, false);
  const link = document.createElement('a');
  link.download = itkExportName(m) + '.jpg';
  link.href = c.toDataURL('image/jpeg', 0.95);
  link.click();
}

// ---------------------------------------------------------------------
// 18b. SVG-EXPORT
// Baut sich aus derselben Ebenenliste wie die Vorschau. Kacheln, Swoosh und
// Icon bleiben echte Vektoren, nur das Foto ist zwangsläufig ein Bitmap –
// es steckt als Data-URL mit drin, die Datei ist also selbsttragend.
// Für Photoshop taugt das wenig (dort wird beim Öffnen gerastert), für
// Illustrator und InDesign dagegen sehr.
// ---------------------------------------------------------------------
function itkXmlId(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function itkMotifSVG(m) {
  const layers = itkBuildLayers(m);

  const defs = [];
  layers.forEach(l => { if (l.defs) defs.push(l.defs()); });

  // Eine Gruppe lohnt erst ab zwei Mitgliedern – sonst entstehen Gruppen mit
  // einem einzigen Kind, die die Ebenenpalette nur aufblähen.
  const count = {};
  layers.forEach(l => { if (l.group) count[l.group] = (count[l.group] || 0) + 1; });

  const body = [];
  let open = null;
  layers.forEach(l => {
    const grp = (l.group && count[l.group] > 1) ? l.group : null;
    if (grp !== open) {
      if (open) body.push('</g>');
      if (grp) body.push('<g id="' + itkXmlId(grp) + '" data-name="' + itkXmlAttr(grp) + '">');
      open = grp;
    }
    const frag = l.svg ? l.svg() : '';
    if (frag) {
      body.push('<g id="' + itkXmlId(l.id) + '" data-name="' + itkXmlAttr(l.name) + '">' +
                frag + '</g>');
    }
  });
  if (open) body.push('</g>');

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'width="' + ITK_W + '" height="' + ITK_H + '" viewBox="0 0 ' + ITK_W + ' ' + ITK_H + '">\n' +
    (defs.length ? '<defs>' + defs.join('') + '</defs>\n' : '') +
    body.join('\n') + '\n</svg>\n';
}

// ---------------------------------------------------------------------
// 18c. PSD-EXPORT
// Jede Ebene der Liste wird einzeln gerastert und als eigene Photoshop-Ebene
// geschrieben – Foto, jede Kachel, Swoosh und Icon getrennt anfassbar.
// Das Schreiben übernimmt ag-psd (vendor/ag-psd.js).
// ---------------------------------------------------------------------

/* Die Icon-Glyphe liegt als Bitmap erst vor, nachdem das eingefärbte SVG
   dekodiert wurde; beim ersten Aufruf liefert itkIconImage null. Ohne dieses
   Warten fehlte die Glyphe in der Datei. */
function itkEnsureIcon(key, color) {
  return new Promise(res => {
    if (key === 'none' || itkIconImage(key, color)) return res();
    const rec = itkIconCache[key + '|' + color];
    if (!rec) return res();
    const prev = rec.img.onload;
    rec.img.onload = e => { if (prev) prev(e); res(); };
    rec.img.onerror = () => res();
    setTimeout(res, 3000);            // nie unbegrenzt warten
  });
}

function itkLayerPixels(l) {
  const c = document.createElement('canvas');
  c.width = ITK_W; c.height = ITK_H;
  const x = c.getContext('2d', { willReadFrequently: true });
  l.draw(x);
  return { canvas: c, data: x.getImageData(0, 0, ITK_W, ITK_H).data };
}

/* Engste Umgrenzung aller nicht vollständig durchsichtigen Pixel. Bewusst aus
   den Pixeln statt aus der angegebenen Geometrie: Kachelkanten liegen auf
   Bruchkoordinaten (0,63 · 1180 = 743,4), dort glättet fillRect – ein
   Rechteck nach Zahlen wäre bis zu einem Pixel zu klein und schnitte die
   Kante ab. Für die Swoosh-Pfade erspart es zusätzlich einen Pfadparser. */
function itkAlphaBBox(data) {
  let minX = ITK_W, minY = ITK_H, maxX = -1, maxY = -1;
  for (let y = 0; y < ITK_H; y++) {
    const row = y * ITK_W * 4;
    for (let x = 0; x < ITK_W; x++) {
      if (data[row + x * 4 + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/* Baut den Photoshop-Ebenenbaum. children[0] ist die unterste Ebene, deshalb
   entspricht die Reihenfolge genau der Zeichenreihenfolge. */
function itkPsdTree(m) {
  const layers = itkBuildLayers(m);
  const count = {};
  layers.forEach(l => { if (l.group) count[l.group] = (count[l.group] || 0) + 1; });

  const children = [], groups = {};
  layers.forEach(l => {
    const px = itkLayerPixels(l);
    const b = itkAlphaBBox(px.data);
    if (!b) return;                   // leere Ebene gar nicht erst schreiben
    const cut = document.createElement('canvas');
    cut.width = b.w; cut.height = b.h;
    cut.getContext('2d').drawImage(px.canvas, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    const rec = {
      name: l.name, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h,
      canvas: cut, opacity: 1, blendMode: 'normal'
    };
    const grp = (l.group && count[l.group] > 1) ? l.group : null;
    if (!grp) { children.push(rec); return; }
    if (!groups[grp]) { groups[grp] = { name: grp, opened: true, children: [] };
                        children.push(groups[grp]); }
    groups[grp].children.push(rec);
  });
  return children;
}

async function itkExportPSD(m) {
  if (!m.img) { itkToast(ITK_TEXT.export.ersteinBildToast); return; }
  if (!window.agPsd || !agPsd.writePsdUint8Array) {
    itkToast(ITK_TEXT.export.psdBausteinFehltToast); return;
  }
  itkToast(ITK_TEXT.export.psdWirdGebautToast);
  await itkEnsureIcon(m.design.iconKey, m.design.iconKey === 'logo' ? KBR.white : m.design.iconFg);
  await itkMtLoadFont();

  const children = itkPsdTree(m);

  // Verbundansicht: ag-psd erzeugt keine. Sie kommt aus demselben
  // itkDrawMotif wie das JPG – Ebenenstapel und Vorschaubild in Photoshop
  // können dadurch nicht auseinanderlaufen.
  const flat = document.createElement('canvas');
  flat.width = ITK_W; flat.height = ITK_H;
  itkDrawMotif(flat.getContext('2d'), m, false);

  const bytes = agPsd.writePsdUint8Array(
    { width: ITK_W, height: ITK_H, children: children, canvas: flat },
    { generateThumbnail: true, noBackground: true });

  itkDownloadBlob(new Blob([bytes], { type: 'image/vnd.adobe.photoshop' }),
                  itkExportName(m) + '.psd');
  itkToast(itkT(ITK_TEXT.export.psdGesichertToast, { mb: (bytes.length / 1048576).toFixed(1) }));
}

function itkExportSVG(m) {
  if (!m.img) { itkToast(ITK_TEXT.export.ersteinBildToast); return; }
  const blob = new Blob([itkMotifSVG(m)], { type: 'image/svg+xml;charset=utf-8' });
  itkDownloadBlob(blob, itkExportName(m) + '.svg');
  itkToast(ITK_TEXT.export.svgGesichertToast);
}

// ---------------------------------------------------------------------
// 19. GESAMT-SYNC
// Eine einzige Stelle, die UI und Zeichnung aus dem State ableitet –
// so kann die Anzeige nie vom tatsächlichen Zustand abweichen.
// ---------------------------------------------------------------------
/* Der Hinweis „Bild hierher ziehen“ gilt nur, solange das Motiv wirklich
   leer ist. Im Kachelmodus ohne Foto steht dort bereits ein Entwurf. */
function itkSyncDropHint() {
  if (!itkDropHint) return;
  const m = itkM();
  itkDropHint.classList.toggle('hidden', !!m.img || itkIsFullTiles(m.design));
}

function itkSyncAll() {
  const m = itkM(), d = m.design;
  // Der echte Zustand hat sich geändert – zwischengespeicherte Hover-Varianten
  // beziehen sich auf den alten und wären damit falsch. Anstehende Timer
  // müssen mit weg, sonst zeichnet ein Nachzügler den alten Stand zurück.
  itkHoverCancelTimers();
  itkHoverOn = false;
  itkHoverClear();
  const area = itkArea(d.areaId);

  const iconSel = document.getElementById('itk-icon-select');
  const textSel = document.getElementById('itk-text-select');
  iconSel.value = d.iconKey;
  textSel.value = itkMtOn(d) ? d.textMode : 'none';
  // Icon und Text schließen sich aus – das jeweils andere Menü wird gesperrt.
  iconSel.disabled = itkMtOn(d);
  textSel.disabled = d.iconKey !== 'none';
  // Der Hinweis zur Mitte gilt nur für echte Icons, nicht für das breite Logo.
  document.getElementById('itk-icon-note').style.display =
    (d.iconKey === 'none' || d.iconKey === 'logo') ? 'none' : '';

  const textFeld = document.getElementById('itk-text-field');
  const textInput = document.getElementById('itk-text-input');
  textFeld.style.display = itkMtOn(d) ? '' : 'none';
  document.getElementById('itk-text-note-schlagwort').style.display =
    d.textMode === 'schlagwort' ? '' : 'none';
  if (textInput.value !== (d.textValue || '')) textInput.value = d.textValue || '';
  // Mit Text ist der Kachelbereich kein Auswahlfeld mehr, sondern folgt
  // automatisch der Zeilenzahl – die Auswahl hätte hier nichts mehr zu tun.
  document.getElementById('itk-area-field').style.display = itkMtOn(d) ? 'none' : '';

  const tiles = document.getElementById('itk-tiles-slider');
  if (area && area.split) {
    const max = itkMaxTiles(d);
    tiles.min = area.min;
    tiles.max = max;
    tiles.value = Math.max(area.min, Math.min(max, d.tiles.length || d.tileCount));
    document.getElementById('itk-tiles-val').textContent = tiles.value;
  }

  itkBuildAreaGrid();
  // Chips zuerst: sie korrigieren die Swoosh-Farbe gegen das Regelwerk, und
  // die Vorschaubildchen im Raster sollen diese korrigierte Farbe zeigen.
  itkBuildSwooshChips();
  itkBuildSwooshGrid();
  // Ein Wechsel des Kachelbereichs ändert die sichtbare Fotofläche und damit
  // die erlaubten Grenzen – hier neu einfangen statt erst beim nächsten Zug.
  itkSetZoom(m.scale);
  itkSyncDropHint();
  itkSyncSteps();
  itkRedraw();
}

function itkToast(msg) {
  const t = document.getElementById('itk-toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(itkToast._t);
  itkToast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------------
// 20. TUTORIAL
// Führt einmal durch den ganzen Entscheidungsbaum. Jeder Schritt darf
// den Zustand so weit vorbereiten, dass das Erklärte auch sichtbar ist –
// sonst zeigt der Spot auf ein gesperrtes Feld.
// ---------------------------------------------------------------------

/* Dieselben Icons wie auf den echten Buttons „Vollbild“ und „Zentrieren“
   (siehe index.html) – klein im Tutorialtext, über {{icon:name}} gesetzt. */
const ITK_TUT_ICONS = {
  fuellen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H4v5"/><path d="M15 4h5v5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/></svg>',
  zentrieren: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>'
};
function itkTutRenderIcons(html) {
  return html.replace(/\{\{icon:(\w+)\}\}/g, (_, key) =>
    '<i class="itk-tut-icon">' + (ITK_TUT_ICONS[key] || '') + '</i>');
}

const ITK_TUT = [
  { sel: null, title: ITK_TEXT.tutorial.schritt1Titel, text: ITK_TEXT.tutorial.schritt1Text },

  { sel: '#itk-stage', title: ITK_TEXT.tutorial.schritt2Titel, text: ITK_TEXT.tutorial.schritt2Text },

  { sel: '.itk-previews', title: ITK_TEXT.tutorial.schritt3Titel, text: ITK_TEXT.tutorial.schritt3Text },

  { sel: '#itk-motifs', title: ITK_TEXT.tutorial.schritt4Titel, text: ITK_TEXT.tutorial.schritt4Text },

  { sel: '#itk-step-bild', title: ITK_TEXT.tutorial.schritt5Titel, text: ITK_TEXT.tutorial.schritt5Text,
    before: () => { itkOpenStep('bild'); if (!itkM().img) itkApplyImageSrc(itkDemoImage(), itkM().name); } },

  { sel: '#itk-zoom-field', title: ITK_TEXT.tutorial.schritt6Titel, text: ITK_TEXT.tutorial.schritt6Text,
    before: () => itkOpenStep('bild') },

  { sel: '#itk-icon-field', title: ITK_TEXT.tutorial.schritt7Titel, text: ITK_TEXT.tutorial.schritt7Text,
    before: () => itkOpenStep('design') },

  { sel: '#itk-area-grid', title: ITK_TEXT.tutorial.schritt8Titel, text: ITK_TEXT.tutorial.schritt8Text,
    before: () => {
      // Mit aktivem Text gibt es dieses Raster gar nicht – der Bereich
      // folgt dann automatisch der Zeilenzahl. Für die Erklärung erst
      // wieder auf eine echte Designoption wechseln.
      itkSelectTextMode('none');
      itkOpenStep('design');
    } },

  { sel: '#itk-step-kacheln', title: ITK_TEXT.tutorial.schritt9Titel, text: ITK_TEXT.tutorial.schritt9Text,
    before: () => {
      const m = itkM();
      if (!itkArea(m.design.areaId).split) {
        // Einen Bereich wählen, der zum aktuellen Icon-Zustand passt –
        // sonst zeigt der Spot auf einen Regler, den es gar nicht gibt.
        itkSelectArea(m.design.iconKey === 'none' ? 'l-right' : 'icon-right');
      }
      itkOpenStep('kacheln');
    } },

  { sel: '#itk-step-swoosh', title: ITK_TEXT.tutorial.schritt10Titel, text: ITK_TEXT.tutorial.schritt10Text,
    before: () => {
      const m = itkM();
      // Mit Text im Motiv gibt es keinen Swoosh – für die Erklärung also
      // erst den Text beiseitelegen.
      m.design.textMode = 'none';
      // Die L-Bereiche verlangen mindestens zwei Kacheln – dort wäre der
      // Swoosh gesperrt. Für die Erklärung auf einen einteilbaren Bereich
      // wechseln.
      if (itkArea(m.design.areaId).min > 1) {
        m.design.areaId = m.design.iconKey === 'none' ? 'right' : 'icon-right';
      }
      m.design.tileCount = 1;
      itkRebuildTiles(m, false);
      m.design.swoosh = 'tile';
      itkEnforceSwooshColor(m);
      itkSyncAll();
      itkOpenStep('swoosh');
    } },

  { sel: '#itk-stage', title: ITK_TEXT.tutorial.schritt11Titel, text: ITK_TEXT.tutorial.schritt11Text },

  { sel: '#itk-step-vorlagen', title: ITK_TEXT.tutorial.schritt12Titel, text: ITK_TEXT.tutorial.schritt12Text,
    before: () => itkOpenStep('vorlagen') },

  { sel: '#itk-export-bar', title: ITK_TEXT.tutorial.schritt13Titel, text: ITK_TEXT.tutorial.schritt13Text },

  { sel: null, title: ITK_TEXT.tutorial.schritt14Titel, text: ITK_TEXT.tutorial.schritt14Text }
];


let itkTutIndex = -1;

function itkTutStart(i) {
  document.getElementById('itk-tut-mask').classList.add('show');
  itkTutGo(i);
}
function itkTutEnd() {
  document.getElementById('itk-tut-mask').classList.remove('show');
  itkTutIndex = -1;
}
function itkTutGo(i) {
  if (i < 0 || i >= ITK_TUT.length) { itkTutEnd(); return; }
  itkTutIndex = i;
  const step = ITK_TUT[i];
  if (step.before) step.before();

  const hole = document.getElementById('itk-tut-hole');
  const card = document.getElementById('itk-tut-card');
  const el = step.sel ? document.querySelector(step.sel) : null;

  if (el) {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Nach dem Scrollen messen, sonst sitzt der Spot auf der alten Position.
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      const pad = 6;
      hole.style.display = 'block';
      hole.style.left = (r.left - pad) + 'px';
      hole.style.top = (r.top - pad) + 'px';
      hole.style.width = (r.width + pad * 2) + 'px';
      hole.style.height = (r.height + pad * 2) + 'px';
      itkTutPlaceCard(card, r);
    }, 260);
  } else {
    hole.style.display = 'none';
    card.style.left = 'calc(50% - 190px)';
    card.style.top = 'calc(50% - 120px)';
  }

  document.getElementById('itk-tut-step').textContent =
    itkT(ITK_TEXT.tutorial.schrittZaehler, { i: i + 1, n: ITK_TUT.length });
  document.getElementById('itk-tut-title').textContent = step.title;
  document.getElementById('itk-tut-text').innerHTML = itkTutRenderIcons(step.text);
  document.getElementById('itk-tut-prev').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('itk-tut-next').textContent =
    i === ITK_TUT.length - 1 ? ITK_TEXT.tutorial.fertig : ITK_TEXT.tutorial.weiter;
  document.getElementById('itk-tut-dots').innerHTML =
    ITK_TUT.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('');
}

/* Karte neben den Spot legen – bevorzugt rechts, sonst links, sonst unten. */
function itkTutPlaceCard(card, r) {
  const cw = 380, ch = card.offsetHeight || 220, gap = 18;
  let left, top;
  if (r.right + gap + cw < innerWidth) left = r.right + gap;
  else if (r.left - gap - cw > 0) left = r.left - gap - cw;
  else left = Math.max(12, Math.min(innerWidth - cw - 12, r.left));
  top = Math.max(12, Math.min(innerHeight - ch - 12, r.top + r.height / 2 - ch / 2));
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}

function itkInitTutorial() {
  document.getElementById('itk-tut-next').addEventListener('click', () => itkTutGo(itkTutIndex + 1));
  document.getElementById('itk-tut-prev').addEventListener('click', () => itkTutGo(itkTutIndex - 1));
  document.getElementById('itk-tut-skip').addEventListener('click', itkTutEnd);
  document.getElementById('itk-tut-close').addEventListener('click', itkTutEnd);
  document.addEventListener('keydown', e => {
    if (itkTutIndex < 0) return;
    if (e.key === 'Escape') itkTutEnd();
    if (e.key === 'ArrowRight') itkTutGo(itkTutIndex + 1);
    if (e.key === 'ArrowLeft') itkTutGo(itkTutIndex - 1);
  });
}

// ---------------------------------------------------------------------
// 21. INIT
// ---------------------------------------------------------------------
function itkMount() {
  itkApplyStaticTexts();
  itkCanvas = document.getElementById('itk-canvas');
  if (!itkCanvas) return;
  itkCtx = itkCanvas.getContext('2d');
  itkStage = document.getElementById('itk-stage');
  itkDropHint = document.getElementById('itk-drop-hint');

  ITK_ICONS.forEach(ic => { itkIconSrc[ic.key] = itkSanitizeIconSVG(ic.svg); });

  itkMotifs = [itkNewMotif(itkT(ITK_TEXT.motive.standardname, { n: 1 }))];
  itkActiveId = itkMotifs[0].id;

  itkLoadTemplates();
  itkBuildMotifs();
  itkBuildTemplates();
  itkBuildPreviewGrid();
  itkInitCanvasInteraction();
  itkInitControls();
  itkInitTutorial();
  itkSyncAll();
  itkMtLoadFont();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', itkMount);
else itkMount();

/* Für die Einbindung in den Brand Hub: itkOpen()/itkClose() der Vorversion
   rufen weiterhin dieselben Bausteine auf – itkMount() ist idempotent zu
   halten reicht, weil aller Zustand in itkMotifs liegt. */
