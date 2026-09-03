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
// =====================================================================

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
  [KBR.navy]: 'Navyblau', [KBR.magenta]: 'Magenta', [KBR.forest]: 'Waldgrün',
  [KBR.lightblue]: 'Hellblau', [KBR.lightgreen]: 'Hellgrün', [KBR.white]: 'Weiß'
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
  { key: 'smart-feed', label: 'Smart Feed', rows: [
    { grid: '100', slots: [
      { format: 'Smart Feed Big',    overlay: 'smartFeedBig' },
      { format: 'Smart Feed Medium', overlay: 'smartFeedMedium' },
      { format: 'Smart Feed Small',  overlay: 'smartFeedSmall' },
      { format: 'Card Image',        overlay: 'none', note: 'Mobile' },
      { format: 'Small Rectangle',   overlay: 'none', note: 'Mobile' }
    ] }
  ] },
  { key: 'story-banner', label: 'Story Banner', rows: [
    { grid: '100', slots: [
      { format: 'News Panorama Large', overlay: 'bottomHeadline' },
      { format: 'Microsite',           overlay: 'microsite', note: 'Mobile' }
    ] },
    { grid: '66/33', slots: [
      { format: 'Widget Main', overlay: 'bannerTop' },
      { format: 'Panorama',    overlay: 'bannerTopPlain', note: 'Tablet' }
    ] },
    { grid: '75/25', slots: [ { format: 'Rectangle', overlay: 'bannerTop' } ] }
  ] },
  { key: 'top-news', label: 'Top News Widget', rows: [
    { grid: '100',   slots: [ { format: 'News Panorama Large', overlay: 'bottomHeadline' } ] },
    { grid: '50/50', slots: [ { format: 'Large Rectangle', overlay: 'bottomHeadline' } ] },
    { grid: '66/33', slots: [
      { format: 'Story Page',         overlay: 'bottomHeadline' },
      { format: 'Portrait Rectangle', overlay: 'bottomHeadline' }
    ] },
    { grid: '75/25', slots: [ { format: 'Rectangle', overlay: 'bottomHeadline' } ] }
  ] },
  { key: 'news-rollup', label: 'News Rollup', rows: [
    { grid: '50/50', slots: [ { format: 'News Grid Small', overlay: 'none' } ] },
    { grid: '66/33', slots: [ { format: 'News Grid Small', overlay: 'none' } ] }
  ] },
  /* Story Carousel und News Carousel spielen dieselben Formate mit derselben
     Überlagerung aus – zwei Einträge wären hier nur doppelte Arbeit. */
  { key: 'story-news-carousel', label: 'Story & News Karussell', rows: [
    { grid: '100',   slots: [ { format: 'Large Rectangle', overlay: 'tagsTop' } ] },
    { grid: '66/33', slots: [
      { format: 'Large Rectangle', overlay: 'tagsTop' },
      { format: 'Small Rectangle', overlay: 'tagsTop' } ] },
    { grid: '75/25', slots: [
      { format: 'Large Rectangle', overlay: 'tagsTop' },
      { format: 'Small Rectangle', overlay: 'tagsTop' } ] }
  ] },
  { key: 'story-cards', label: 'Personalised Story Cards', rows: [
    { grid: '100', slots: [
      { format: 'Large Rectangle', overlay: 'storyCard' },
      { format: 'Large Rectangle', overlay: 'none', note: 'Mobile' },
      { format: 'Small Panorama',  overlay: 'none', note: 'Mobile' }
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
  { id: 'none', label: 'Keine Kacheln', icon: 'both', min: 0, split: null },

  { id: 'bottom-s', label: 'Von unten, schmal',  icon: false, min: 1, split: { type: 'bottom', y: 0.74 } },
  { id: 'bottom-l', label: 'Von unten, hoch',    icon: false, min: 1, split: { type: 'bottom', y: 0.56 } },
  { id: 'right',    label: 'Von rechts',         icon: false, min: 1, split: { type: 'right',  x: 0.63 } },
  { id: 'left',     label: 'Von links',          icon: false, min: 1, split: { type: 'left',   x: 0.37 } },
  { id: 'l-right',  label: 'Von unten & rechts', icon: false, min: 2, split: { type: 'l-right', x: 0.66, y: 0.70 } },
  { id: 'l-left',   label: 'Von unten & links',  icon: false, min: 2, split: { type: 'l-left',  x: 0.34, y: 0.70 } },

  { id: 'icon-left',   label: 'Von links',  icon: true, min: 1, split: { type: 'left',   x: 0.50 } },
  { id: 'icon-right',  label: 'Von rechts', icon: true, min: 1, split: { type: 'right',  x: 0.50 } },
  { id: 'icon-bottom', label: 'Von unten',  icon: true, min: 1, split: { type: 'bottom', y: 0.50 } }
];
function itkArea(id) { return ITK_AREAS.find(a => a.id === id); }
function itkAreasFor(hasIcon) {
  return ITK_AREAS.filter(a => a.icon === 'both' || a.icon === hasIcon);
}

/* Foto-Restfläche und Startrechtecke der Kachelfläche. Die halbe Kontur
   wird auf beiden Seiten der Trennlinie abgezogen, damit die weiße Fuge
   überall exakt ITK_GAP breit ist – auch zwischen Foto und Kachel. */
function itkRegions(split, W, H, gap) {
  const g = gap / 2;
  if (!split) return { photo: { x: 0, y: 0, w: W, h: H }, seeds: [] };
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
const ITK_ICONS = [
  { key: 'party', label: 'Party', svg: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m16.057 25.106c-1.097.404-2.49.916-4.252 1.569-3.009-.42-6.171-1.399-7.538-3.646.498-1.341.932-2.516 1.316-3.553 2.576 2.976 7.077 4.866 10.474 5.63z"/><path d="m16.931 15.069c-2.928-2.927-6.698-5.089-8.235-3.549-.328.328-.229.132-2.508 6.317 2.43 3.507 8.57 5.956 12.847 6.171 1.279-.481 1.249-.505 1.446-.703 1.885-1.885-1.666-6.353-3.55-8.236zm2.488 7.174c-.143.145-.808.152-1.989-.431-1.284-.635-2.749-1.742-4.125-3.118-3.188-3.188-3.933-5.73-3.549-6.114.06-.06.172-.092.331-.092.861 0 3.092.951 5.784 3.642 1.376 1.376 2.484 2.841 3.119 4.125.583 1.179.573 1.845.429 1.988z"/><path d="m9.059 27.694c-1.732.644-3.729 1.39-6.048 2.259-.603.222-1.187-.364-.964-.964.584-1.564 1.111-2.978 1.591-4.268 1.318 1.514 3.3 2.432 5.421 2.973z"/><path d="m19.669 3.895c-.467.082-.918.156-1.224.31.46.706 1.421 1.605.834 2.779-.525 1.05-1.616.988-2.563 1.021.581.794 1.253 1.599.735 2.636-.537 1.075-1.945 1.298-2.776 1.433-.269.044-.519-.136-.569-.403l-.182-.982c-.051-.273.133-.536.406-.584.473-.083.916-.155 1.224-.31-.462-.701-1.419-1.609-.835-2.778.524-1.047 1.614-.988 2.563-1.021-.582-.794-1.253-1.599-.735-2.636.537-1.074 1.946-1.298 2.775-1.433.269-.044.519.136.568.403l.182.982c.053.273-.129.535-.403.583z"/><path d="m28.689 11.925.982.182c.268.05.447.3.403.568-.135.829-.359 2.238-1.433 2.775-1.037.518-1.842-.153-2.636-.735-.033.949.026 2.04-1.021 2.563-1.169.584-2.077-.373-2.778-.835-.155.308-.227.751-.31 1.224-.048.274-.311.457-.584.406l-.982-.182c-.268-.05-.447-.3-.403-.569.135-.83.359-2.238 1.433-2.776 1.036-.518 1.842.154 2.636.735.033-.947-.029-2.039 1.021-2.563 1.174-.587 2.073.374 2.779.834.154-.306.228-.757.31-1.224.047-.271.309-.453.583-.403z"/><path d="m25.7 21h-1.9c-.166 0-.3-.134-.3-.3v-.9c0-.166.134-.3.3-.3h1.9c.166 0 .3.134.3.3v.9c0 .166-.134.3-.3.3z"/><path d="m27.788 3.273-1.344 1.344c-.117.117-.307.117-.424 0l-.636-.637c-.117-.117-.117-.307 0-.424l1.344-1.344c.117-.117.307-.117.424 0l.636.636c.117.117.117.307 0 .425z"/><path d="m12.2 6.5h-.9c-.166 0-.3-.134-.3-.3v-1.9c0-.166.134-.3.3-.3h.9c.166 0 .3.134.3.3v1.9c0 .166-.134.3-.3.3z"/><path d="m19.383 13.255-.75-.5c-.141-.094-.182-.284-.085-.423 2.041-2.904 5.976-5.931 10.139-6.077.171-.005.313.137.313.307v.901c0 .16-.126.285-.286.292-3.483.138-7.051 2.761-8.928 5.424-.093.133-.269.166-.403.076z"/></svg>' },
  { key: 'aufruf', label: 'Aufruf', svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="m15.87882 15.08708h-8.87659c-1.65125 0-3.00223 1.35104-3.00223 3.00223v14.74094c0 1.65125 1.35098 3.00223 3.00223 3.00223h8.87659z"/><path d="m49.95414 6.91102c-1.11248-.54566-2.41062-.32765-3.32247.48035-6.08708 4.97236-13.89881 7.71874-21.74616 7.69568 0 .00002-7.0052.00002-7.0052.00002v20.7454h7.00521c7.88972-.03305 15.61756 2.73346 21.79623 7.73577 1.8495 1.66611 5.06814.24231 4.98363-2.27181.00005.00012.00005-31.67339.00005-31.67339 0-1.17091-.65051-2.21167-1.71129-2.71204z"/><path d="m53.66692 17.59895v15.71169c8.44644-1.914 8.44177-13.80043 0-15.71169z"/><path d="m22.22357 37.83397h-11.68868l7.74575 17.14275c.66046 1.46111 2.12157 2.41183 3.73275 2.41183 2.60236.06921 4.68895-2.62641 3.9629-5.13387.00007.00005-3.75272-14.42071-3.75272-14.42071z"/></svg>' },
  { key: 'event', label: 'Event', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect height="6" rx="2" width="4" x="11" y="3"/><rect height="6" rx="2" width="4" x="33" y="3"/><path d="m4 18v23c0 2.209 1.791 4 4 4h32c2.209 0 4-1.791 4-4v-23zm12 20c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm11 11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm11 11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2zm0-11c0 1.105-.895 2-2 2h-2c-1.105 0-2-.895-2-2v-2c0-1.105.895-2 2-2h2c1.105 0 2 .895 2 2z"/><path d="m44 16v-6c0-2.209-1.791-4-4-4h-1v1c0 2.206-1.794 4-4 4s-4-1.794-4-4v-1h-14v1c0 2.206-1.794 4-4 4s-4-1.794-4-4v-1h-1c-2.209 0-4 1.791-4 4v6z"/></svg>' },
  { key: 'team', label: 'Team', svg: '<svg viewBox="0 0 511.999 511.999" xmlns="http://www.w3.org/2000/svg"><path d="M438.09,273.32h-39.596c4.036,11.05,6.241,22.975,6.241,35.404v149.65c0,5.182-0.902,10.156-2.543,14.782h65.461c24.453,0,44.346-19.894,44.346-44.346v-81.581C512,306.476,478.844,273.32,438.09,273.32z"/><path d="M107.265,308.725c0-12.43,2.205-24.354,6.241-35.404H73.91c-40.754,0-73.91,33.156-73.91,73.91v81.581c0,24.452,19.893,44.346,44.346,44.346h65.462c-1.641-4.628-2.543-9.601-2.543-14.783V308.725z"/><path d="M301.261,234.815h-90.522c-40.754,0-73.91,33.156-73.91,73.91v149.65c0,8.163,6.618,14.782,14.782,14.782h208.778c8.164,0,14.782-6.618,14.782-14.782v-149.65C375.171,267.971,342.015,234.815,301.261,234.815z"/><path d="M256,38.84c-49.012,0-88.886,39.874-88.886,88.887c0,33.245,18.349,62.28,45.447,77.524c12.853,7.23,27.671,11.362,43.439,11.362c15.768,0,30.586-4.132,43.439-11.362c27.099-15.244,45.447-44.28,45.447-77.524C344.886,78.715,305.012,38.84,256,38.84z"/><path d="M99.918,121.689c-36.655,0-66.475,29.82-66.475,66.475c0,36.655,29.82,66.475,66.475,66.475c9.298,0,18.152-1.926,26.195-5.388c13.906-5.987,25.372-16.585,32.467-29.86c4.98-9.317,7.813-19.946,7.813-31.227C166.393,151.51,136.573,121.689,99.918,121.689z"/><path d="M412.082,121.689c-36.655,0-66.475,29.82-66.475,66.475c0,11.282,2.833,21.911,7.813,31.227c7.095,13.276,18.561,23.874,32.467,29.86c8.043,3.462,16.897,5.388,26.195,5.388c36.655,0,66.475-29.82,66.475-66.475C478.557,151.509,448.737,121.689,412.082,121.689z"/></svg>' },
  { key: 'emotionen', label: 'Emotionen', svg: '<svg viewBox="0 0 512.001 512.001" xmlns="http://www.w3.org/2000/svg"><path d="m256.001 477.407c-2.59 0-5.179-.669-7.499-2.009-2.52-1.454-62.391-36.216-123.121-88.594-35.994-31.043-64.726-61.833-85.396-91.513-26.748-38.406-40.199-75.348-39.982-109.801.254-40.09 14.613-77.792 40.435-106.162 26.258-28.848 61.3-44.734 98.673-44.734 47.897 0 91.688 26.83 116.891 69.332 25.203-42.501 68.994-69.332 116.891-69.332 35.308 0 68.995 14.334 94.859 40.362 28.384 28.563 44.511 68.921 44.247 110.724-.218 34.393-13.921 71.279-40.728 109.632-20.734 29.665-49.426 60.441-85.279 91.475-60.508 52.373-119.949 87.134-122.45 88.588-2.331 1.354-4.937 2.032-7.541 2.032z"/></svg>' }
];
const ITK_ICON_MAX_BYTES = 300 * 1024;

/* Bereinigte Quell-SVGs (Formen auf #000000 normiert) und daraus abgeleitete,
   eingefärbte Bitmaps. Der Platzhalter #000000 wird beim Rendern durch die
   jeweils gültige Sekundärfarbe ersetzt – deshalb ein Cache pro Farbe. */
const itkIconSrc   = {};   // key -> { svg, vbW, vbH }
const itkIconCache = {};   // 'key|#RRGGBB' -> { img, ready, vbW, vbH }
let   itkCustomIconLabel = 'Eigenes SVG';

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
    tileCount: 3,
    tiles: [],            // { x, y, w, h, color }
    swoosh: 'none',       // 'none' | 'photo' | 'tile' | 'mask'
    swooshColor: KBR.lightgreen,
    maskBase: KBR.magenta
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
let itkShowDanger = false;   // Schutzzonen sind eine Prüfhilfe, kein Grundzustand
let itkHitRegions = [];          // Treffer-Flächen für den Doppelklick
let itkPreviewCanvases = [];
let itkPopTarget = null;

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
  const { seeds } = itkRegions(area.split, ITK_W, ITK_H, ITK_GAP);
  const n = Math.max(area.min, Math.min(5, d.tileCount));
  d.tiles = itkSplitTiles(seeds, n, Math.random);
  itkColorTiles(d.tiles, Math.random);
  if (prev) d.tiles.forEach((t, i) => { if (prev[i]) t.color = prev[i]; });
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
}

// ---------------------------------------------------------------------
// 8. RENDERING
// Zeichnet ein Motiv in einen 1180×623-Kontext. `collect` registriert
// dabei die Trefferflächen für den Farb-Doppelklick – das passiert nur
// für das aktive Motiv, nicht für Thumbnails oder den Sammelexport.
// ---------------------------------------------------------------------
const ITK_ICON_SIZE = 202;      // Kantenlänge der quadratischen Icon-Kachel

function itkDrawPhoto(ctx, m, clip) {
  if (!m.img) return;
  ctx.save();
  if (clip) { ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip(); }
  ctx.translate(ITK_W / 2 + m.x, ITK_H / 2 + m.y);
  ctx.scale(m.scale, m.scale);
  ctx.drawImage(m.img, -m.img.width / 2, -m.img.height / 2);
  ctx.restore();
}

/* Swoosh in ein Zielrechteck legen. mode 'contain' passt ihn hinein,
   'bleed' lässt ihn bewusst über die Kanten hinauslaufen. */
function itkSwooshTransform(ctx, rect, factor) {
  const s = Math.min(rect.w / ITK_SWOOSH_VB.w, rect.h / ITK_SWOOSH_VB.h) * factor;
  const w = ITK_SWOOSH_VB.w * s, h = ITK_SWOOSH_VB.h * s;
  ctx.translate(rect.x + (rect.w - w) / 2, rect.y + (rect.h - h) / 2);
  ctx.scale(s, s);
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

function itkDrawMotif(ctx, m, collect) {
  const d = m.design;
  const area = itkArea(d.areaId);
  const split = area ? area.split : null;
  if (collect) itkHitRegions = [];

  ctx.clearRect(0, 0, ITK_W, ITK_H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ITK_W, ITK_H);

  // --- Sonderfall: Swoosh als Maske. Der Swoosh ersetzt hier das Layout –
  // farbige Vollfläche, darauf eine farbige Kante, darin das Foto.
  if (d.swoosh === 'mask') {
    ctx.fillStyle = d.maskBase;
    ctx.fillRect(0, 0, ITK_W, ITK_H);

    // Die Kante entsteht aus einer zweiten, minimal größeren und leicht
    // versetzten Kopie desselben Pfades. Ein gleichmäßiger Stroke wäre
    // überall gleich dick; die versetzte Kopie läuft an den Spitzen des
    // Swooshs keilförmig aus – genau wie in der Vorlage.
    ctx.save();
    itkMaskEdgeTransform(ctx);
    ctx.fillStyle = d.swooshColor;
    ctx.fill(ITK_SWOOSH_PATH);
    ctx.restore();

    ctx.save();
    itkMaskPhotoTransform(ctx);
    ctx.clip(ITK_MASK_PHOTO_PATH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    itkDrawPhoto(ctx, m, null);
    ctx.restore();

    if (collect) {
      itkHitRegions.push({ kind: 'maskBase', mask: true });
      itkHitRegions.push({ kind: 'maskEdge', mask: true });
    }
    itkDrawIcon(ctx, m, collect);
    return;
  }

  // --- Regelfall: Foto auf der Restfläche, Kacheln daneben.
  const { photo } = itkRegions(split, ITK_W, ITK_H, ITK_GAP);
  itkDrawPhoto(ctx, m, split ? photo : null);

  d.tiles.forEach((t, i) => {
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x, t.y, t.w, t.h);
    if (collect) itkHitRegions.push({ kind: 'tile', index: i, rect: t });
  });

  if (d.swoosh === 'tile' && d.tiles.length === 1) {
    const t = d.tiles[0];
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
    // Nach der Kachel registriert und als Pfad geprüft: der Doppelklick trifft
    // den Swoosh nur dort, wo er wirklich liegt – daneben bleibt die Kachel
    // erreichbar.
    if (collect) itkHitRegions.push({ kind: 'swooshTile', tile: t, swooshFit: 1.35 });
  }

  // --- Swoosh direkt auf dem Foto: rechtsbündig auf der Fotofläche.
  if (d.swoosh === 'photo') {
    const p = split ? photo : { x: 0, y: 0, w: ITK_W, h: ITK_H };
    const h = p.h * 0.76;
    const w = h * (ITK_SWOOSH_VB.w / ITK_SWOOSH_VB.h);
    const rect = { x: p.x + p.w - w - p.w * 0.02, y: p.y + (p.h - h) / 2, w, h };
    ctx.save();
    ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    ctx.save();
    itkSwooshTransform(ctx, rect, 1);
    ctx.fillStyle = d.swooshColor;
    ctx.fill(ITK_SWOOSH_PATH);
    ctx.restore();
    ctx.restore();
    if (collect) itkHitRegions.push({ kind: 'swooshPhoto', rect });
  }

  itkDrawIcon(ctx, m, collect);
}

/* Icon: quadratische Kachel exakt in der Mitte des Layouts, mit weißer
   Kontur ringsum. Die Glyphe nimmt automatisch die zur Fläche passende
   Sekundärfarbe an. */
function itkDrawIcon(ctx, m, collect) {
  const d = m.design;
  if (d.iconKey === 'none') return;
  const S = ITK_ICON_SIZE, g = ITK_GAP;
  const cx = ITK_W / 2, cy = ITK_H / 2;
  const box = { x: cx - S / 2, y: cy - S / 2, w: S, h: S };

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(box.x - g, box.y - g, S + g * 2, S + g * 2);
  ctx.fillStyle = d.iconBg;
  ctx.fillRect(box.x, box.y, S, S);

  const rec = itkIconImage(d.iconKey, d.iconFg);
  if (rec) {
    const inner = S * 0.56;
    const s = Math.min(inner / rec.vbW, inner / rec.vbH);
    const iw = rec.vbW * s, ih = rec.vbH * s;
    ctx.drawImage(rec.img, cx - iw / 2, cy - ih / 2, iw, ih);
  }
  if (collect) itkHitRegions.push({ kind: 'icon', rect: box });
}

function itkRedraw() {
  if (!itkCtx) return;
  itkDrawMotif(itkCtx, itkM(), true);

  itkPreviewCanvases.forEach(rec => {
    itkCenterCrop(itkCanvas, rec.fmt.w, rec.fmt.h, rec.canvas);
    const draw = ITK_OVERLAYS[rec.overlay];
    if (draw) draw(rec.canvas.getContext('2d'), rec.fmt.w, rec.fmt.h, itkShowDanger);
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
const ITK_OV_RED  = 'rgba(214, 8, 18, 0.60)';
const ITK_OV_PINK = '#e5007d';
const ITK_OV_FONT = "'Inter', 'Helvetica Neue', Arial, sans-serif";
const ITK_OV_HEAD = 'Lorem ipsum dolor sit amet consetetur sadipscing elitr';
const ITK_OV_VIEWS = '362', ITK_OV_LIKES = '12', ITK_OV_PAGE = '1 von 5';
const ITK_OV_NAME  = 'Max Mustermensch';
const ITK_OV_META  = 'in 2 Jahren | 94 Abrufe | 1 Reaktion';

function itkOvUnit(w, h) { return Math.sqrt(w * h); }
function itkOvDanger(ctx, x, y, w, h, show) { if (!show) return; ctx.fillStyle = ITK_OV_RED; ctx.fillRect(x, y, w, h); }
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
function itkOvBanner(ctx, w, h, danger, withAvatar) {
  const u = itkOvUnit(w, h), pad = 0.042 * u;
  itkOvScrim(ctx, 0, 0, w, h * 0.60, true);
  itkOvDanger(ctx, 0, 0, w, h * 0.50, danger);
  const hs = 0.055 * u, ss = 0.030 * u;
  itkOvText(ctx, 'Lorem ipsum dolor sit amet', pad, h * 0.19, hs, 700);
  itkOvText(ctx, 'consetetur sadipscing elitr', pad, h * 0.30, hs, 700);
  itkOvText(ctx, itkOvClip(ctx, ITK_OV_HEAD, w - pad * 2, ss, 400), pad, h * 0.385, ss, 400);
  itkOvText(ctx, 'Datum der Veranstaltung: 11 Sep.', pad, h * 0.455, ss, 400);
  itkOvScrim(ctx, 0, h * 0.62, w, h * 0.38, false);
  itkOvDanger(ctx, 0, h * 0.80, w, h * 0.20, danger);
  const ms = 0.028 * u;
  let tx = pad;
  if (withAvatar) { const r = 0.035 * w; itkOvCircle(ctx, pad + r, h * 0.895, r); tx = pad + r * 2 + pad * 0.6; }
  itkOvText(ctx, ITK_OV_NAME, tx, h * 0.875, ms, 700);
  itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w * 0.55, ms, 400), tx, h * 0.945, ms, 400);
  itkOvPlayerRow(ctx, w, h * 0.905, u, pad);
}

const ITK_OVERLAYS = {
  none: null,
  bottomHeadline(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, h * 0.42, w, h * 0.58, false);
    itkOvDanger(ctx, 0, h * 0.615, w, h * 0.385, danger);
    itkOvText(ctx, 'Mission My-T', pad, h * 0.70, 0.021 * u, 400);
    const hs = 0.053 * u;
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_HEAD, w - pad * 2, hs, 700), pad, h * 0.80, hs, 700);
    itkOvStatsRow(ctx, h * 0.915, u, pad);
    itkOvPlayerRow(ctx, w, h * 0.915, u, pad);
  },
  tagsTop(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    const pillH = 0.075 * h, gapY = 0.025 * h, padY = 0.04 * h;
    const band = padY * 2 + pillH * 2 + gapY;
    itkOvScrim(ctx, 0, 0, w, band * 1.25, true);
    itkOvDanger(ctx, 0, 0, w, band, danger);
    const pillW = 0.185 * w, gapX = 0.018 * w;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++)
      itkOvPill(ctx, pad + c * (pillW + gapX), padY + r * (pillH + gapY), pillW, pillH);
    itkOvText(ctx, 'Bereits gelesen', w - pad, padY + pillH * 0.8, 0.027 * u, 400, 'right');
  },
  smartFeedBig(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.55, true);
    itkOvDanger(ctx, 0, 0, w, h * 0.48, danger);
    const pillH = 0.062 * h, pillW = 0.15 * w, gapX = 0.017 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.055, pillW, pillH);
    const hs = 0.062 * u;
    itkOvText(ctx, 'Lorem ipsum dolor sit amet', pad, h * 0.32, hs, 700);
    itkOvText(ctx, 'consetetur sadipscing elitr', pad, h * 0.44, hs, 700);
    itkOvScrim(ctx, 0, h * 0.58, w, h * 0.42, false);
    itkOvDanger(ctx, 0, h * 0.74, w, h * 0.26, danger);
    const r = 0.038 * w, tx = pad + r * 2 + pad * 0.6;
    itkOvCircle(ctx, pad + r, h * 0.855, r);
    itkOvText(ctx, ITK_OV_NAME, tx, h * 0.845, 0.026 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w * 0.45, 0.024 * u, 400), tx, h * 0.915, 0.024 * u, 400);
    itkOvStatsRow(ctx, h * 0.88, u, w - pad - 0.20 * u);
  },
  smartFeedMedium(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.50, true);
    itkOvDanger(ctx, 0, 0, w, h * 0.42, danger);
    const pillH = 0.065 * h, pillW = 0.24 * w, gapX = 0.02 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.06, pillW, pillH);
    const cr = 0.045 * w, hs = 0.055 * u, tx = pad + cr * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + cr, h * 0.265, cr);
    itkOvText(ctx, 'Lorem ipsum dolor sit amet', tx, h * 0.28, hs, 700);
    itkOvText(ctx, 'consetetur sadipscing elitr', tx, h * 0.38, hs, 700);
    itkOvScrim(ctx, 0, h * 0.54, w, h * 0.46, false);
    itkOvDanger(ctx, 0, h * 0.71, w, h * 0.29, danger);
    const r = 0.055 * w, bx = pad + r * 2 + pad * 0.6;
    itkOvCircle(ctx, pad + r, h * 0.845, r);
    itkOvText(ctx, ITK_OV_NAME, bx, h * 0.815, 0.030 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w - bx - pad, 0.028 * u, 400), bx, h * 0.90, 0.028 * u, 400);
  },
  smartFeedSmall(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.05 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.50, true);
    itkOvDanger(ctx, 0, 0, w, h * 0.42, danger);
    const pillH = 0.09 * h, pillW = 0.26 * w, gapX = 0.03 * w;
    for (let c = 0; c < 3; c++) itkOvPill(ctx, pad + c * (pillW + gapX), h * 0.07, pillW, pillH);
    const cr = 0.055 * w, tx = pad + cr * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + cr, h * 0.30, cr);
    itkOvText(ctx, itkOvClip(ctx, 'Lorem ipsum dolor sit amet', w - tx - pad, 0.075 * u, 700), tx, h * 0.335, 0.075 * u, 700);
    itkOvScrim(ctx, 0, h * 0.50, w, h * 0.50, false);
    itkOvDanger(ctx, 0, h * 0.62, w, h * 0.38, danger);
    const r = 0.075 * w, bx = pad + r * 2 + pad * 0.5;
    itkOvCircle(ctx, pad + r, h * 0.80, r);
    itkOvText(ctx, ITK_OV_NAME, bx, h * 0.78, 0.070 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, 'in 2 Jahren | 94 Abrufe', w - bx - pad, 0.065 * u, 400), bx, h * 0.90, 0.065 * u, 400);
  },
  bannerTop(ctx, w, h, danger)      { itkOvBanner(ctx, w, h, danger, true); },
  bannerTopPlain(ctx, w, h, danger) { itkOvBanner(ctx, w, h, danger, false); },
  storyCard(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.042 * u;
    itkOvScrim(ctx, 0, 0, w, h * 0.52, true);
    itkOvDanger(ctx, 0, 0, w, h * 0.41, danger);
    const hs = 0.058 * u;
    itkOvText(ctx, 'Lorem ipsum dolor sit amet', pad, h * 0.215, hs, 700);
    itkOvText(ctx, 'consetetur sadipscing elitr', pad, h * 0.30, hs, 700);
    itkOvText(ctx, 'Datum', pad, h * 0.375, 0.028 * u, 400);
    itkOvScrim(ctx, 0, h * 0.58, w, h * 0.42, false);
    itkOvDanger(ctx, 0, h * 0.74, w, h * 0.26, danger);
    const r = 0.068 * w, tx = pad + r * 2 + pad * 0.7;
    itkOvCircle(ctx, pad + r, h * 0.845, r);
    itkOvText(ctx, ITK_OV_NAME, tx, h * 0.83, 0.030 * u, 700);
    itkOvText(ctx, itkOvClip(ctx, ITK_OV_META, w - tx - pad, 0.028 * u, 400), tx, h * 0.895, 0.028 * u, 400);
  },
  microsite(ctx, w, h, danger) {
    const u = itkOvUnit(w, h), pad = 0.045 * u;
    itkOvDanger(ctx, 0, 0, w, h, danger);
    const hs = 0.062 * u, ss = 0.040 * u;
    itkOvText(ctx, 'Lorem ipsum dolor sit amet', pad, h * 0.29, hs, 700);
    itkOvText(ctx, 'consetetur sadipscing elitr', pad, h * 0.40, hs, 700);
    itkOvText(ctx, itkOvClip(ctx, 'Lorem ipsum dolor sit amet consetetur', w - pad * 2, ss, 400), pad, h * 0.49, ss, 400);
    itkOvText(ctx, 'Datum', pad, h * 0.575, ss, 400);
    itkOvText(ctx, ITK_OV_NAME, pad, h * 0.735, 0.038 * u, 700);
    itkOvText(ctx, 'in 2 Jahren | 94 Abrufe', pad, h * 0.815, 0.034 * u, 400);
    itkOvText(ctx, 'Info', pad, h * 0.885, 0.030 * u, 400);
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

/* Testmotiv: erzeugt ein Bild im Browser, damit sich der Generator auch
   ohne Datei ausprobieren lässt (und das Tutorial nie ins Leere läuft). */
function itkDemoImage() {
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
  x.fillText('Testmotiv 1180 × 623', ITK_W / 2, ITK_H - 34);
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

  const lock = {
    bild: false,
    design: !hasImg,
    kacheln: !hasImg || !area || !area.split,
    swoosh: !hasImg || tileCount > 1,
    vorlagen: false      // Vorlagen lassen sich auch ohne Bild pflegen
  };
  ITK_STEP_IDS.forEach(s => {
    const el = itkStepEl(s);
    el.classList.toggle('locked', lock[s]);
    if (lock[s]) el.classList.remove('open');
  });

  const sub = {
    bild: hasImg ? 'Zoom ' + Math.round(m.scale * 100) + '%' : 'kein Bild',
    design: (d.iconKey === 'none' ? 'ohne Icon' : 'Icon: ' + itkIconLabel(d.iconKey)) +
            ' · ' + (area ? area.label : '–'),
    kacheln: area && area.split ? tileCount + (tileCount === 1 ? ' Kachel' : ' Kacheln') : 'keine Kacheln',
    swoosh: lock.swoosh ? 'ab 2 Kacheln nicht möglich' : itkSwooshLabel(d.swoosh),
    vorlagen: itkTemplates.length + (itkTemplates.length === 1 ? ' Vorlage' : ' Vorlagen')
  };
  ITK_STEP_IDS.forEach(s => {
    document.getElementById('itk-sub-' + s).textContent = sub[s];
    itkStepEl(s).classList.toggle('done', !lock[s]);
  });

  // Der Zufallsbutton sitzt unter dem Vorschaufenster und gehört damit nicht
  // mehr zum Kachel-Reiter – er muss sich hier eigenständig sperren.
  const rnd = document.getElementById('itk-random-btn');
  if (rnd) rnd.disabled = !hasImg || !area || !area.split;

  const exportBtns = document.querySelectorAll('#itk-export-bar button');
  exportBtns.forEach(b => { b.disabled = !hasImg; });
  const cnt = document.getElementById('itk-export-count');
  if (cnt) cnt.textContent = itkMotifs.length > 1 ? itkMotifs.length + ' Motive' : '1180 × 623 px';

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
const ITK_SWOOSH_LABELS = {
  none: 'kein Swoosh', photo: 'auf Bild', tile: 'in Kachel', mask: 'als Maske'
};
function itkSwooshLabel(k) { return ITK_SWOOSH_LABELS[k] || k; }

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
  const hasIcon = m.design.iconKey !== 'none';
  const list = itkAreasFor(hasIcon);
  grid.innerHTML = '';
  list.forEach(a => {
    const el = document.createElement('div');
    el.className = 'itk-choice' + (a.id === m.design.areaId ? ' active' : '');
    el.innerHTML = `<div class="itk-choice-vis">${itkAreaThumbHTML(a)}</div>
                    <div class="itk-choice-cap">${a.label}</div>`;
    el.title = a.label + (a.min > 1 ? ' (mindestens ' + a.min + ' Kacheln)' : '');
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
    if (d.swoosh === 'tile') d.swoosh = 'photo';
  } else {
    d.tileCount = Math.max(area.min, Math.min(5, d.tileCount));
    itkRebuildTiles(m, false);
    if (d.tiles.length > 1 && d.swoosh !== 'none') d.swoosh = 'none';
    if (d.swoosh === 'mask') d.swoosh = 'none';
  }
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
  if (!m.img) return;
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
  { id: 'none',  label: 'Kein Swoosh' },
  { id: 'photo', label: 'Swoosh auf Bild' },
  { id: 'tile',  label: 'Swoosh in Kachel' },
  { id: 'mask',  label: 'Swoosh als Maske' }
];

function itkSwooshOptionsFor(d) {
  const area = itkArea(d.areaId);
  const n = area && area.split ? d.tiles.length : 0;
  if (n === 0) return ['none', 'photo', 'mask'];   // ohne Kacheln: frei auf dem Bild oder als Maske
  if (n === 1) return ['none', 'tile', 'photo'];   // eine Kachel: Swoosh darf hinein
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
    note.textContent = 'Der Swoosh steht zur Verfügung, solange höchstens eine Kachel im Einsatz ist.';
    return;
  }
  field.style.display = '';

  let allowed, why;
  if (d.swoosh === 'photo') {
    allowed = KBR_SWOOSH_ON_PHOTO;
    why = 'Auf dem Foto sind Hellgrün und Hellblau zugelassen.';
  } else if (d.swoosh === 'tile') {
    const base = d.tiles[0] ? d.tiles[0].color : KBR.navy;
    allowed = kbrAllowedOn(base);
    why = `Auf ${KBR_NAMES[base]} ist ${allowed.map(c => KBR_NAMES[c]).join(' oder ')} erlaubt. ` +
          'Die Kachelfarbe änderst du per Doppelklick auf die Kachel.';
  } else {
    allowed = kbrAllowedOn(d.maskBase);
    why = `Fläche ${KBR_NAMES[d.maskBase]} – Kante in ${allowed.map(c => KBR_NAMES[c]).join(' oder ')}. ` +
          'Die Flächenfarbe änderst du per Doppelklick auf die farbige Fläche.';
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

  let options, current, apply, label, hint;

  if (hit.kind === 'tile') {
    options = KBR_PRIMARIES; current = d.tiles[hit.index].color;
    label = 'Kachelfarbe';
    hint = 'Kacheln nutzen ausschließlich die drei Primärfarben.';
    apply = c => { d.tiles[hit.index].color = c; itkEnforceSwooshColor(m); };
  } else if (hit.kind === 'icon') {
    options = KBR_PRIMARIES; current = d.iconBg;
    label = 'Icon-Fläche';
    hint = 'Die Glyphe übernimmt automatisch die passende Sekundärfarbe.';
    apply = c => { d.iconBg = c; d.iconFg = kbrAllowedOn(c)[0]; };
  } else if (hit.kind === 'maskBase') {
    options = KBR_PRIMARIES; current = d.maskBase;
    label = 'Farbfläche';
    hint = 'Die Swoosh-Kante wird auf eine erlaubte Sekundärfarbe gesetzt.';
    apply = c => { d.maskBase = c; d.swooshColor = kbrFix(d.swooshColor, kbrAllowedOn(c)); };
  } else if (hit.kind === 'maskEdge') {
    options = kbrAllowedOn(d.maskBase); current = d.swooshColor;
    label = 'Swoosh-Kante';
    hint = `Auf ${KBR_NAMES[d.maskBase]} zulässig.`;
    apply = c => { d.swooshColor = c; };
  } else if (hit.kind === 'swooshTile') {
    const base = d.tiles[0] ? d.tiles[0].color : KBR.navy;
    options = kbrAllowedOn(base); current = d.swooshColor;
    label = 'Swoosh in Kachel';
    hint = `Auf ${KBR_NAMES[base]} zulässig.`;
    apply = c => { d.swooshColor = c; };
  } else if (hit.kind === 'swooshPhoto') {
    options = KBR_SWOOSH_ON_PHOTO; current = d.swooshColor;
    label = 'Swoosh auf Bild';
    hint = 'Auf dem Foto sind Hellgrün und Hellblau zugelassen.';
    apply = c => { d.swooshColor = c; };
  } else return;

  title.textContent = label;
  rule.textContent = hint;
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
    el.title = 'Motiv ' + (i + 1) + (m.img ? '' : ' · noch ohne Bild');
    el.innerHTML = ITK_PAGE_SVG + '<span class="itk-page-no">' + (i + 1) + '</span>';
    el.addEventListener('click', () => itkSelectMotif(m.id));
    if (itkMotifs.length > 1) {
      const del = document.createElement('span');
      del.className = 'itk-page-del'; del.textContent = '×'; del.title = 'Motiv entfernen';
      del.addEventListener('click', ev => { ev.stopPropagation(); itkRemoveMotif(m.id); });
      el.appendChild(del);
    }
    wrap.appendChild(el);
  });

  const add = document.createElement('button');
  add.className = 'itk-page-add'; add.title = 'Weiteres Motiv anlegen';
  add.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  add.addEventListener('click', itkAddMotif);
  wrap.appendChild(add);
}

function itkAddMotif() {
  // Neues Motiv erbt das Design des aktuellen – in der Praxis will man
  // meist dieselbe Gestaltung mit einem anderen Bild.
  const cur = itkM();
  const m = itkNewMotif('Motiv ' + (itkMotifs.length + 1));
  m.design = JSON.parse(JSON.stringify(cur.design));
  itkMotifs.push(m);
  itkActiveId = m.id;
  itkBuildMotifs();
  itkSyncAll();
  itkOpenStep('bild');
  itkToast('Motiv angelegt – jetzt Bild wählen');
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
  itkDropHint.classList.toggle('hidden', !!m.img);
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
  catch (e) { itkToast('Vorlagen konnten nicht gespeichert werden'); }
}

function itkSaveTemplate() {
  const input = document.getElementById('itk-tpl-name');
  const name = (input.value || '').trim() || 'Vorlage ' + (itkTemplates.length + 1);
  const d = JSON.parse(JSON.stringify(itkM().design));
  const existing = itkTemplates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
  const rec = { id: 't' + Date.now().toString(36), name, design: d };
  if (existing >= 0) itkTemplates[existing] = rec; else itkTemplates.push(rec);
  itkStoreTemplates();
  input.value = '';
  itkBuildTemplates();
  itkSyncSteps();
  itkToast(existing >= 0 ? 'Vorlage „' + name + '“ aktualisiert' : 'Vorlage „' + name + '“ gesichert');
}

function itkApplyTemplate(id) {
  const t = itkTemplates.find(x => x.id === id);
  if (!t) return;
  const m = itkM();
  m.design = JSON.parse(JSON.stringify(t.design));
  itkEnforceSwooshColor(m);
  itkSyncAll();
  itkToast('Vorlage „' + t.name + '“ angewendet');
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
    list.innerHTML = '<div class="itk-tpl-empty">Noch keine Vorlage gesichert. Design einstellen, oben benennen, „Sichern“.</div>';
    return;
  }
  itkTemplates.forEach(t => {
    const area = itkArea(t.design.areaId);
    const n = t.design.tiles ? t.design.tiles.length : 0;
    const meta = [
      area ? area.label : '–',
      n ? n + ' Kacheln' : 'ohne Kacheln',
      t.design.iconKey !== 'none' ? 'Icon' : null,
      t.design.swoosh !== 'none' ? 'Swoosh ' + itkSwooshLabel(t.design.swoosh) : null
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
    mkBtn('Vorlage anwenden',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      () => itkApplyTemplate(t.id));
    mkBtn('Vorlage umbenennen',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
      () => itkRenameTemplate(t.id, nameEl));
    mkBtn('Vorlage löschen',
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
    if (hit) itkOpenColorPop(hit, e); else itkClosePop();
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

  document.getElementById('itk-remove-btn').addEventListener('click', () => {
    const m = itkM();
    m.img = null; m.src = null; m.x = 0; m.y = 0;
    document.getElementById('itk-zoom-slider').min = 5;
    itkSetZoom(1);
    itkCanvas.style.cursor = 'crosshair';
    itkDropHint.classList.remove('hidden');
    itkSyncAll();
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
  document.getElementById('itk-icon-file-input').addEventListener('change', e => {
    itkHandleIconUpload(e.target.files[0]); e.target.value = '';
  });

  const tiles = document.getElementById('itk-tiles-slider');
  tiles.addEventListener('input', () => {
    const m = itkM();
    m.design.tileCount = +tiles.value;
    document.getElementById('itk-tiles-val').textContent = tiles.value;
    itkRebuildTiles(m, true);
    if (m.design.tiles.length > 1 && m.design.swoosh !== 'none') m.design.swoosh = 'none';
    itkSyncAll();
  });
  document.getElementById('itk-random-btn').addEventListener('click', () => {
    const m = itkM();
    itkRebuildTiles(m, false);
    itkSyncAll();
    itkToast('Aufteilung & Farben neu gewürfelt');
  });

  document.getElementById('itk-tpl-save').addEventListener('click', itkSaveTemplate);
  document.getElementById('itk-tpl-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') itkSaveTemplate();
  });

  const widgetSel = document.getElementById('itk-widget-select');
  const dangerCb = document.getElementById('itk-danger-toggle');
  const syncDanger = () => {
    const off = itkWidget === 'none';
    dangerCb.disabled = off;
    document.getElementById('itk-danger-wrap').classList.toggle('disabled', off);
  };
  widgetSel.addEventListener('change', () => {
    itkWidget = widgetSel.value;
    syncDanger(); itkBuildPreviewGrid(); itkRedraw();
  });
  dangerCb.addEventListener('change', () => { itkShowDanger = dangerCb.checked; itkRedraw(); });
  syncDanger();

  document.getElementById('itk-download').addEventListener('click', () => itkExport(itkM()));
  document.getElementById('itk-download-all').addEventListener('click', () => {
    itkMotifs.filter(m => m.img).forEach((m, i) => setTimeout(() => itkExport(m), i * 350));
  });

  document.getElementById('itk-tutorial-btn').addEventListener('click', () => itkTutStart(0));
}

function itkSelectIcon(key) {
  const m = itkM(), d = m.design;
  const had = d.iconKey !== 'none';
  d.iconKey = key;
  const has = key !== 'none';
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
  itkSyncAll();
}

async function itkHandleIconUpload(file) {
  const sel = document.getElementById('itk-icon-select');
  if (!file) return;
  if (file.size > ITK_ICON_MAX_BYTES) { itkToast('SVG zu groß (max. 300 KB)'); return; }
  if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
    itkToast('Bitte eine SVG-Datei wählen'); return;
  }
  const clean = itkSanitizeIconSVG(await file.text());
  if (!clean) { itkToast('SVG konnte nicht gelesen werden'); return; }
  itkIconSrc.custom = clean;
  Object.keys(itkIconCache).forEach(k => { if (k.startsWith('custom|')) delete itkIconCache[k]; });
  itkCustomIconLabel = file.name.replace(/\.svg$/i, '').slice(0, 24);

  let opt = sel.querySelector('option[value="custom"]');
  if (!opt) {
    opt = document.createElement('option');
    opt.value = 'custom';
    sel.insertBefore(opt, sel.querySelector('option[value="__upload__"]'));
  }
  opt.textContent = 'Eigenes: ' + itkCustomIconLabel;
  sel.value = 'custom';
  itkSelectIcon('custom');
  itkToast('Icon „' + itkCustomIconLabel + '“ hinzugefügt');
}

function itkExport(m) {
  const c = document.createElement('canvas');
  c.width = ITK_W; c.height = ITK_H;
  itkDrawMotif(c.getContext('2d'), m, false);
  const link = document.createElement('a');
  link.download = 'KBR_Intranet_Kachel_' + m.name.replace(/[^\w\-]+/g, '_') + '.jpg';
  link.href = c.toDataURL('image/jpeg', 0.95);
  link.click();
}

// ---------------------------------------------------------------------
// 19. GESAMT-SYNC
// Eine einzige Stelle, die UI und Zeichnung aus dem State ableitet –
// so kann die Anzeige nie vom tatsächlichen Zustand abweichen.
// ---------------------------------------------------------------------
function itkSyncAll() {
  const m = itkM(), d = m.design;
  // Der echte Zustand hat sich geändert – zwischengespeicherte Hover-Varianten
  // beziehen sich auf den alten und wären damit falsch. Anstehende Timer
  // müssen mit weg, sonst zeichnet ein Nachzügler den alten Stand zurück.
  itkHoverCancelTimers();
  itkHoverOn = false;
  itkHoverClear();
  const area = itkArea(d.areaId);

  document.getElementById('itk-icon-select').value = d.iconKey;
  document.getElementById('itk-icon-note').style.display = d.iconKey === 'none' ? 'none' : '';

  const tiles = document.getElementById('itk-tiles-slider');
  if (area && area.split) {
    tiles.min = area.min;
    tiles.value = Math.max(area.min, Math.min(5, d.tiles.length || d.tileCount));
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
const ITK_TUT = [
  { sel: null, title: 'Willkommen im Kachel Generator',
    text: '<p>Du baust hier ein Intranet-Motiv aus vier Bausteinen: <b>Bild</b>, <b>Kacheln</b> in den drei Primärfarben, <b>weißen Konturen</b> und dem organischen <b>Swoosh</b>.</p><p>Die Leiste links führt dich Schritt für Schritt durch – jeder Schritt schaltet erst frei, wenn der davor sitzt.</p>' },

  { sel: '#itk-motifs', title: 'Mehrere Motive pro Session',
    text: '<p>Jede nummerierte Seite ist ein eigenes Motiv. Mit <b>+</b> legst du eine weitere an – sie übernimmt das Design der aktuellen, du tauschst nur das Bild.</p><p>Ein Klick wechselt die Seite, das <b>×</b> entfernt sie.</p>' },

  { sel: '#itk-step-bild', title: '1 · Bild',
    text: '<p>Bild hochladen oder direkt ins Vorschaufenster ziehen. Ideal sind <b>1180 × 623 px</b>.</p><p>Ohne eigenes Bild erzeugt <b>Testmotiv</b> eine Platzhaltergrafik zum Ausprobieren.</p>',
    before: () => { itkOpenStep('bild'); if (!itkM().img) itkApplyImageSrc(itkDemoImage(), itkM().name); } },

  { sel: '#itk-zoom-field', title: 'Zoom & Ausschnitt',
    text: '<p>Der Regler zoomt, die beiden Icons daneben sind <b>Füllen</b> und <b>Zentrieren</b>. Im Vorschaufenster verschiebst du das Bild mit gedrückter Maustaste, das Mausrad zoomt ebenfalls.</p><p>Weiter herauszoomen als bis zur <b>Füllen</b>-Stufe geht nicht – darunter bliebe unter dem Foto Fläche frei. Wie weit das ist, hängt vom Kachelbereich ab: Was Kacheln verdecken, muss das Bild nicht abdecken.</p>',
    before: () => itkOpenStep('bild') },

  { sel: '#itk-icon-field', title: '2 · Erst das Icon entscheiden',
    text: '<p>Das Icon ist die erste Weiche. Es sitzt <b>immer mittig</b> im Layout – deshalb schrumpft die Auswahl der Kachelbereiche mit Icon von sechs auf drei mittig geteilte Varianten.</p><p>Eigene SVGs lassen sich hochladen; die Glyphe wird automatisch neu eingefärbt.</p>',
    before: () => itkOpenStep('design') },

  { sel: '#itk-area-grid', title: 'Designposition wählen',
    text: '<p>Der Kachelbereich bestimmt, welche Fläche das Foto behält und wo die Kacheln sitzen: von unten, von den Seiten oder als L aus Bodenband und Spalte.</p><p>Ganz links steht <b>Keine Kacheln</b> – dann arbeitest du nur mit Bild und Swoosh.</p>',
    before: () => itkOpenStep('design') },

  { sel: '#itk-step-kacheln', title: '3 · Kacheln aufteilen',
    text: '<p>Der Regler teilt den Bereich in <b>1 bis 5</b> Unterkacheln. Die L-Bereiche brauchen mindestens zwei.</p><p><b>Zufall</b> rechts unter dem Vorschaufenster würfelt Aufteilung und Farben neu – benachbarte Kacheln bekommen dabei nie dieselbe Farbe.</p>',
    before: () => {
      const m = itkM();
      if (!itkArea(m.design.areaId).split) {
        // Einen Bereich wählen, der zum aktuellen Icon-Zustand passt –
        // sonst zeigt der Spot auf einen Regler, den es gar nicht gibt.
        itkSelectArea(m.design.iconKey === 'none' ? 'l-right' : 'icon-right');
      }
      itkOpenStep('kacheln');
    } },

  { sel: '#itk-stage', title: 'Farben per Doppelklick',
    text: '<p><b>Doppelklick auf jede Fläche</b> im Vorschaufenster öffnet die Farbauswahl.</p><p>Kacheln: Magenta, Navyblau, Waldgrün. Der Swoosh: Hellblau oder Hellgrün. Beim Icon wählst du die Fläche – die Glyphe nimmt automatisch die passende Sekundärfarbe an. Die weißen Konturen sind fix.</p>' },

  { sel: '#itk-step-swoosh', title: '4 · Swoosh',
    text: '<p>Der Swoosh steht bereit, solange <b>höchstens eine Kachel</b> im Spiel ist: einzeln auf dem Bild, innerhalb der einen Kachel oder groß als <b>Maske</b> über einer Farbfläche mit farbiger Kante.</p><p>Das Regelwerk gilt auch hier: Hellblau auf Navyblau, Hellgrün auf Waldgrün, Hellgrün oder Weiß auf Magenta.</p>',
    before: () => {
      const m = itkM();
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

  { sel: '#itk-step-vorlagen', title: '5 · Vorlagen',
    text: '<p>Ein fertiges Design lässt sich benennen und sichern. Die Vorlage merkt sich Aufteilung, Farben, Icon und Swoosh – <b>nicht</b> das Bild.</p><p>So wendest du dieselbe Gestaltung auf beliebig viele Motive an. Über die drei Symbole je Eintrag wird eine Vorlage <b>angewendet</b>, <b>umbenannt</b> oder <b>gelöscht</b>.</p>',
    before: () => itkOpenStep('vorlagen') },

  { sel: '.itk-widget-bar', title: 'Alle Ausspielformate im Blick',
    text: '<p>Rechts läuft dein Motiv durch alle Intranet-Formate mit – in ihrer echten Ausspielgröße.</p><p>Über <b>Widget-Vorschau</b> siehst du zusätzlich die Oberfläche, die das Intranet darüberlegt. Der Haken <b>Schutzzonen einblenden</b> markiert dann rot, wo kein wichtiges Bilddetail liegen darf.</p>' },

  { sel: '#itk-export-bar', title: 'Export',
    text: '<p>Die Exportleiste bleibt immer sichtbar. Sie gibt das Masterformat <b>1180 × 623 px</b> als JPG aus – einzeln oder für alle Motive der Session auf einmal.</p><p>Das war alles. Über <b>Tutorial</b> oben rechts kommst du jederzeit hierher zurück.</p>' }
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
    card.style.left = 'calc(50% - 165px)';
    card.style.top = 'calc(50% - 120px)';
  }

  document.getElementById('itk-tut-step').textContent = 'Schritt ' + (i + 1) + ' / ' + ITK_TUT.length;
  document.getElementById('itk-tut-title').textContent = step.title;
  document.getElementById('itk-tut-text').innerHTML = step.text;
  document.getElementById('itk-tut-prev').style.visibility = i === 0 ? 'hidden' : 'visible';
  document.getElementById('itk-tut-next').textContent = i === ITK_TUT.length - 1 ? 'Fertig' : 'Weiter';
  document.getElementById('itk-tut-dots').innerHTML =
    ITK_TUT.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('');
}

/* Karte neben den Spot legen – bevorzugt rechts, sonst links, sonst unten. */
function itkTutPlaceCard(card, r) {
  const cw = 330, ch = card.offsetHeight || 220, gap = 18;
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
  itkCanvas = document.getElementById('itk-canvas');
  if (!itkCanvas) return;
  itkCtx = itkCanvas.getContext('2d');
  itkStage = document.getElementById('itk-stage');
  itkDropHint = document.getElementById('itk-drop-hint');

  ITK_ICONS.forEach(ic => { itkIconSrc[ic.key] = itkSanitizeIconSVG(ic.svg); });

  itkMotifs = [itkNewMotif('Motiv 1')];
  itkActiveId = itkMotifs[0].id;

  itkLoadTemplates();
  itkBuildMotifs();
  itkBuildTemplates();
  itkBuildPreviewGrid();
  itkInitCanvasInteraction();
  itkInitControls();
  itkInitTutorial();
  itkSyncAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', itkMount);
else itkMount();

/* Für die Einbindung in den Brand Hub: itkOpen()/itkClose() der Vorversion
   rufen weiterhin dieselben Bausteine auf – itkMount() ist idempotent zu
   halten reicht, weil aller Zustand in itkMotifs liegt. */
