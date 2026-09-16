// =====================================================================
// TEXTE – alle sichtbaren Wörter und Sätze des Kachel Generators an einer
// Stelle. Diese Datei ändern reicht, um Formulierungen anzupassen – ohne
// intranet.js oder index.html anzufassen. Nach dem Speichern die Seite im
// Browser neu laden (Cmd/Strg + Shift + R), damit die Änderung ankommt.
//
// Wie man liest:
//   key: 'Text'                        -> einfach den Text zwischen den
//                                          Anführungszeichen ersetzen.
//   key: 'Text mit {{platzhalter}}'    -> {{platzhalter}} steht für einen
//                                          Wert, den das Programm einsetzt
//                                          (eine Zahl, ein Name …). Diesen
//                                          Teil unbedingt so stehen lassen,
//                                          er darf sich aber an eine andere
//                                          Stelle im Satz verschieben.
//   <b>...</b>                         -> Fettung; bleibt beim Bearbeiten
//                                          am besten erhalten.
//
// Deutsche Anführungszeichen sind „so“ geschrieben (unten-oben), nicht "so".
// =====================================================================

const ITK_TEXT = {

  // ============================== Kopfzeile ==============================
  kopf: {
    titel: 'My-T Kachel-Generator',
    tutorialBtn: 'Tutorial',
    tutorialBtnTitel: 'Tutorial starten'
  },

  // ==================== Motiv-Vorschau (oben links) =======================
  motiv: {
    label: 'Motiv · 1180 × 623 px',
    dropZeile1: 'Bild hierherziehen oder unten hochladen.',
    dropZeile2: 'Ideal: 1180 × 623 px',
    // Erscheint nur beim Überfahren des Motivs mit der Maus.
    bedienhinweis: '<b>Doppelklick</b> öffnet die Farbauswahl · <b>Ziehen</b> verschiebt · <b>Scrollen</b> zoomt',
    zufallBtn: 'Zufall',
    zufallBtnTitel: 'Aufteilung & Farben der Kacheln zufällig neu würfeln'
  },

  // ============================ Reiter 1 · Bild ============================
  bild: {
    reiterTitel: 'Bild',
    unterzeileLeer: 'nur Kacheln',
    unterzeileOhneFoto: 'nur Kachlen',
    unterzeileZoom: 'Zoom {{p}}%',
    uploadBtnTitel: 'Bild wählen',
    entfernenBtnTitel: 'Bild entfernen',
    testmotivBtn: 'Testmotiv',
    testmotivBtnTitel: 'Testmotiv erzeugen',
    keinBildBtn: 'Nur Kacheln',
    keinBildBtnTitel: 'Die ganze Fläche wird in Kacheln geteilt',
    zoomLabel: 'Zoom & Ausschnitt',
    fuellenBtnTitel: 'Vollbild',
    zentrierenBtnTitel: 'Zentrieren',
    // Erscheint, wenn testmotive.js beim Veröffentlichen vergessen wurde.
    fehlendesTestmotivToast: 'testmotive.js nicht geladen – Platzhalter statt Beispielmotiv',
    // Text, der auf dem selbst erzeugten Platzhalterbild steht (nur falls
    // testmotive.js fehlt).
    platzhalterBeschriftung: 'Testmotiv 1180 × 623'
  },

  // ===== Kachelbereiche (Auswahlraster im Reiter „Icon & Designoption) =====
  // Diese Bezeichnungen erscheinen als Bildunterschrift unter jeder Kachel-
  // Vorschau und im Zusammenfassungstext der Reiter/Vorlagen.
  bereiche: {
    'none':        'Keine Kacheln',
    'bottom-s':    'unten, schmal',
    'bottom-l':    'unten, breit',
    'right':       'rechts',
    'left':        'links',
    'l-right':     'unten & rechts',
    'l-left':      'unten & links',
    'icon-left':   'links',
    'icon-right':  'rechts',
    'icon-bottom': 'unten',
    'full':        'Ganze Fläche'
  },
  // Zusatz im Tooltip eines Kachelbereichs, der mindestens {{n}} Kacheln braucht.
  bereichMindestensHinweis: ' (mindestens {{n}} Kacheln)',

  // =================== Reiter 2 · Icon & Designoption ====================
  icon: {
    reiterTitel: 'Icon & Designoption',
    frage: 'Icon verwenden?',
    keinIcon: 'Kein Icon',
    eigenesHochladen: 'Eigenes SVG hochladen …',
    // Wird vor den Dateinamen gesetzt, sobald ein eigenes Icon hochgeladen ist.
    eigenesPraefix: 'Eigenes: {{name}}',
    eigenesStandardname: 'Eigenes SVG',
    hinweisMittig: 'Icons sitzen <b>immer mittig</b> im Layout. Deshalb stehen nur die drei mittig geteilten Designoptionen zur Verfügung.',
    designpositionLabel: 'Designoption · Kachelbereich',
    unterzeileOhneIcon: 'ohne Icon',
    unterzeilePraefix: 'Icon: {{name}}',
    // Namen der fünf mitgelieferten Icons (erscheinen im Auswahlmenü).
    symbole: {
      party: 'Party',
      aufruf: 'Aufruf',
      event: 'Event',
      team: 'Team',
      emotionen: 'Emotionen'
    },
    hochgeladenToast: 'Icon „{{name}}“ hinzugefügt',
    zuGrossToast: 'SVG zu groß (max. 300 KB)',
    falscherTypToast: 'Bitte eine SVG-Datei wählen',
    unlesbarToast: 'SVG konnte nicht gelesen werden'
  },

  // ============================ Reiter 3 · Kacheln ==========================
  kacheln: {
    reiterTitel: 'Kacheln',
    anzahlLabel: 'Anzahl der Kacheln',
    hinweis: '<b>Klicke doppelt</b> auf eine Kachel, um die Farbe zu wechseln oder ein Bild einzufügen',
    unterzeileKeine: 'keine Kacheln',
    unterzeileEinzahl: ' Kachel',
    unterzeileMehrzahl: ' Kacheln',
    gewuerfeltToast: 'Aufteilung & Farben neu gewürfelt',
    keinBildEingesetztToast: 'Ganze Fläche in Kacheln – Doppelklick setzt Farbe oder Bild',
    bildGesetztToast: 'Bild in die Kachel gesetzt'
  },

  // ============================= Reiter 4 · Swoosh ==========================
  swoosh: {
    reiterTitel: 'Swoosh',
    varianteLabel: 'Swoosh-Position',
    farbeLabel: 'Swoosh-Farbe',
    // Beschriftungen im Auswahlraster der vier Swoosh-Positionen.
    optionen: {
      none:  'Kein Swoosh',
      photo: 'Swoosh auf Bild',
      tile:  'Swoosh in Kachel',
      mask:  'Swoosh als Maske'
    },
    // Kurzform derselben Varianten für Unterzeilen und Vorlagen-Zusammenfassungen.
    kurzlabel: {
      none:  'kein Swoosh',
      photo: 'auf Bild',
      tile:  'in Kachel',
      mask:  'als Maske'
    },
    unterzeileGesperrt: 'ab 2 Kacheln nicht möglich',
    hinweisKeinSwoosh: 'Der Swoosh steht zur Verfügung, solange höchstens eine Kachel im Einsatz ist.',
    hinweisAufBild: 'Je nach Hintergrund stehen dir verschiedene Swoosh-Farben zur Verfügung. Du kannst die Farbe auch per Doppelklick auf den Swoosh ändern. ',
    hinweisInKachel: 'Auf {{farbe}} ist {{erlaubt}} erlaubt. Die Kachelfarbe änderst du per Doppelklick auf die Kachel.',
    hinweisAlsMaske: 'Fläche {{farbe}} – Kante in {{erlaubt}}. Die Flächenfarbe änderst du per Doppelklick auf die farbige Fläche.'
  },

  // ============================ Reiter 5 · Vorlagen =========================
  vorlagen: {
    reiterTitel: 'Vorlagen',
    sichernLabel: 'Aktuelles Design sichern',
    namePlatzhalter: 'Name, z. B. „News zweifarbig“',
    sichernBtn: 'Sichern',
    gespeicherteLabel: 'Gespeicherte Vorlagen',
    leerHinweis: 'Noch keine Vorlage vorhanden.',
    // Vorgeschlagener Name, wenn beim Sichern keiner eingegeben wurde.
    standardname: 'Vorlage {{n}}',
    anwendenTitel: 'Vorlage anwenden',
    umbenennenTitel: 'Vorlage umbenennen',
    loeschenTitel: 'Vorlage löschen',
    gesichertToast: 'Vorlage „{{name}}“ gesichert',
    aktualisiertToast: 'Vorlage „{{name}}“ aktualisiert',
    angewendetToast: 'Vorlage „{{name}}“ angewendet',
    nichtGespeichertToast: 'Vorlagen konnten nicht gespeichert werden',
    unterzeileEinzahl: ' Vorlage',
    unterzeileMehrzahl: ' Vorlagen',
    // Zusammenfassungszeile unter jedem gespeicherten Eintrag,
    // z. B. „Von rechts · 3 Kacheln · Icon · Swoosh in Kachel“.
    ohneKacheln: 'ohne Kacheln',
    kachelnEinzahl: ' Kachel',
    kachelnMehrzahl: ' Kacheln',
    iconVorhanden: 'Icon',
    swooshPraefix: 'Swoosh ',
    weiterbearbeitenLabel: 'Zum Weiterbearbeiten',
    psdBtn: 'PSD mit Ebenen',
    psdBtnTitel: 'Photoshop-Datei mit getrennten Ebenen: Foto, jede Kachel, Swoosh und Icon',
    svgBtn: 'SVG',
    svgBtnTitel: 'Vektordatei für Illustrator und InDesign'
  },

  // ======================= Motive (Seiten-Leiste im Motiv) ==================
  motive: {
    // Vorgeschlagener Name für ein neu angelegtes Motiv.
    standardname: 'Motiv {{n}}',
    seiteTitel: 'Motiv {{n}}',
    seiteOhneBildZusatz: ' · noch ohne Bild',
    entfernenTitel: 'Motiv entfernen',
    hinzufuegenTitel: 'Weiteres Motiv anlegen',
    angelegtToast: 'Motiv angelegt – jetzt Bild wählen'
  },

  // ================================ Farbnamen ===============================
  // Werden überall dort verwendet, wo eine Farbe beim Namen genannt wird
  // (Farb-Popup, Hinweistexte, Vorlagen-Zusammenfassung).
  farben: {
    navy:       'Navyblau',
    magenta:    'Magenta',
    forest:     'Waldgrün',
    hellblau:   'Hellblau',
    hellgruen:  'Hellgrün',
    weiss:      'Weiß'
  },

  // =================== Farb-Popup (Doppelklick auf eine Fläche) =============
  popup: {
    kachelfarbeLabel: 'Kachelfarbe',
    kachelfarbeHinweis: 'Kacheln nutzen ausschließlich die drei Primärfarben.',
    kachelBildErsetzenHinweis: 'Eine Farbe zu wählen ersetzt das Bild wieder.',
    kachelOderBildHinweis: 'Kacheln nutzen die drei Primärfarben – oder ein eigenes Bild.',
    iconFlaecheLabel: 'Icon-Fläche',
    iconFlaecheHinweis: 'Die Glyphe übernimmt automatisch die passende Sekundärfarbe.',
    maskenflaecheLabel: 'Farbfläche',
    maskenflaecheHinweis: 'Die Swoosh-Kante wird auf eine erlaubte Sekundärfarbe gesetzt.',
    maskenkanteLabel: 'Swoosh-Kante',
    swooshInKachelLabel: 'Swoosh in Kachel',
    swooshAufBildLabel: 'Swoosh auf Bild',
    swooshAufBildHinweis: 'Auf dem Foto sind Hellgrün und Hellblau zugelassen.',
    // {{farbe}} wird durch einen Namen aus „farben“ oben ersetzt.
    zulaessigAuf: 'Auf {{farbe}} zulässig.',
    bildEinsetzenBtn: 'Bild einsetzen',
    bildTauschenBtn: 'Bild tauschen',
    bildEntfernenTitel: 'Bild aus der Kachel nehmen'
  },

  // ========================= Vorschau-Spalte (rechts) ========================
  vorschau: {
    widgetLabel: 'Widget-Vorschau',
    widgetUntertitel: 'Sieh direkt, wie dein Motiv in allen Formaten und Grids in My-T dargestellt wird.',
    widgetAuswahl: 'Widget-Auswahl',
    schutzzonenLabel: 'Schutzzonen einblenden',
    produktivLabel: 'Meistgenutzte Formate',
    weitereLabel: 'Weitere Formate'
  },
  // Namen der Widgets im Auswahlmenü „Widget-Vorschau“.
  widgets: {
    'smart-feed':           'Smart Feed',
    'story-banner':         'Story Banner',
    'top-news':             'Top News Widget',
    'news-rollup':          'News Rollup',
    'story-news-carousel':  'Story & News Karussell',
    'story-cards':          'Personalised Story Cards'
  },
  // Kleine Zusatzhinweise unter einzelnen Formatvorschauen einer Widget-Ansicht.
  widgetNotizen: { mobile: 'Mobile', tablet: 'Tablet' },

  // ============================ Exportleiste (unten) =========================
  export: {
    jpgBtn: 'Aktuelles Motiv',
    standardGroesse: '1180 × 623 px',
    // Ersetzt die Größenangabe, sobald mehrere Motive in der Sitzung liegen.
    motiveAnzahl: '{{n}} Motive',
    alleBtn: 'Alle Motive',
    alleBtnTitel: 'Alle Motive dieser Session exportieren',
    ersteinBildToast: 'Erst ein Bild wählen',
    psdBausteinFehltToast: 'PSD-Baustein fehlt – vendor/ag-psd.js prüfen',
    psdWirdGebautToast: 'PSD wird gebaut …',
    psdGesichertToast: 'PSD gesichert · {{mb}} MB',
    svgGesichertToast: 'SVG gesichert – Vektor für Illustrator und InDesign',
    // Vorangestellt an jeden heruntergeladenen Dateinamen.
    dateiPraefix: 'KBR_Intranet_Kachel_'
  },

  // ================================ Tutorial ==================================
  tutorial: {
    schrittZaehler: 'Tutorial {{i}} / {{n}}',
    ueberspringen: 'Überspringen',
    zurueck: 'Zurück',
    weiter: 'Weiter',
    fertig: 'Fertig',
    schliessenTitel: 'Tutorial beenden',

    // Die vierzehn Tutorial-Schritte, in der Reihenfolge, in der sie erscheinen.
    schritt1Titel: 'Willkommen im My-T Kachel-Generator',
    schritt1Text: '<p>Mit diesem Generator erstellst du in wenigen Schritten ein individuelles Motiv für News-Artikel im My‑T. Grundlage sind ein Bild, Kacheln und der Swoosh des KBR-Designs.</p><p>Alle Einstellungen für dein Motiv findest du in der linken Leiste.</p>',

    schritt2Titel: 'Motiv',
    schritt2Text: '<p>In diesem Bereich siehst du dein Mastermotiv im Format 1180 × 623 px. Alle Ausspielformate der News-Widgets im My-T werden automatisch daraus abgeleitet.</p>',

    schritt3Titel: 'Vorschau',
    schritt3Text: '<p>Die Vorschau zeigt dein Motiv in den wichtigsten Ausspielformaten. So erkennst du direkt, wie Bild, Kacheln und Swoosh in den verschiedenen Darstellungen wirken.</p><p>Über <b>Widget-Vorschau</b> kannst du einzelne Widgets in verschiedenen Formaten gezielt prüfen. Mit dem Haken <b>Schutzzonen einblenden</b> werden Bereiche markiert, die für wichtige Bildinhalte freigehalten werden sollten, da sie im My-T von Textüberlagerungen verdeckt werden könnten.</p>',

    schritt4Titel: 'Mehrere Motive auf einmal erstellen',
    schritt4Text: '<p>Du kannst mehrere Motive auf einmal anlegen. Jede nummerierte Seite steht für ein eigenes Motiv. Mit <b>+</b> fügst du weitere Motive hinzu, mit <b>×</b> entfernst du sie wieder.</p>',

    schritt5Titel: '1 · Bild',
    schritt5Text: '<p>Lade ein Bild hoch oder ziehe es direkt in das Vorschaufenster. Über „Testmotiv“ fügst du ein Platzhalterbild zum Ausprobieren ein.</p><p><b>Alternativ kannst du auch ein Motiv ohne Bild erstellen.</b> Klicke dafür auf „ohne Bild“. Die Fläche wird dann vollständig mit Kacheln gefüllt.</p>',

    schritt6Titel: 'Zoom & Ausschnitt',
    // {{icon:fuellen}} und {{icon:zentrieren}} setzen die echten kleinen
    // Button-Icons ein – die Namen dürfen sich nicht ändern.
    schritt6Text: '<p>Passe den Bildausschnitt mit dem Zoom-Regler an. Über die Buttons „Vollbild“ {{icon:fuellen}} und „Zentrieren“ {{icon:zentrieren}} kannst du das Bild automatisch ausrichten.</p><p>Alternativ kannst du das Bild direkt im Motiv verschieben oder mit dem Mausrad zoomen.</p>',

    schritt7Titel: '2 · Icon auswählen',
    schritt7Text: '<p>Du kannst auf deinem Motiv ein Icon ergänzen. Das Icon wird <b>immer mittig</b> platziert.</p><p>Du kannst auch eigene SVGs hochladen. Die Farbe und Größe deines Icons wird dabei automatisch angepasst.</p>',

    schritt8Titel: 'Design auswählen',
    schritt8Text: '<p>Je nach Einstellungen (mit/ohne Icon, mit/ohne Bild) hast du verschiedene Layoutoptionen zur Verfügung.</p><p>Wählst du die Option „Keine Kacheln“, wird im Motiv nur dein Bild mit Icon oder Swoosh angezeigt.</p>',

    schritt9Titel: '3 · Kacheln bearbeiten',
    schritt9Text: '<p>Teile dein Design in bis zu 5 Kacheln auf. Je nach Designoptionen benötigst du eine unterschiedliche Mindest- bzw. Maximalanzahl an Kacheln.</p><p>Mit dem Button „Zufall“ rechts unter dem Motiv werden Aufteilung und Farbe der Kacheln automatisch neu kombiniert. Benachbarte Kacheln erhalten dabei nie dieselbe Farbe.</p>',

    schritt10Titel: '4 · Swoosh hinzufügen',
    schritt10Text: '<p>Der Swoosh kann verwendet werden, wenn du höchstens eine Kachel ausgewählt hast.</p><p>Er kann entweder innerhalb der Kachel oder als Kontur integriert werden.</p>',

    schritt11Titel: 'Farben ändern',
    schritt11Text: '<p>Per <b>Doppelklick</b> auf eine Kachel oder den Swoosh im Motiv kannst du die Farbe ändern.</p><p>Für Kacheln stehen Magenta, Navyblau und Waldgrün zur Verfügung. Je nach Designoption kann der Swoosh hellblau, hellgrün oder weiß eingefärbt werden. Die weißen Konturen bleiben unverändert.</p>',

    schritt12Titel: '5 · Vorlagen erstellen',
    schritt12Text: '<p>Speichere wiederkehrende Designs als Vorlage. Dabei werden Aufteilung, Farben und Swoosh, nicht jedoch das Bild, gespeichert.</p><p>Für die Weiterbearbeitung stehen PSD und SVG zur Verfügung: PSD enthält separate Ebenen für Bild und Kacheln. SVG speichert alle Elemente außer dem Bild als Vektoren.</p>',

    schritt13Titel: 'Export',
    schritt13Text: '<p>Exportiere einzelne Motive alle deine Motive gesammelt als JPG im Format 1180 × 623 px.</p>',

    schritt14Titel: 'Geschafft!',
    schritt14Text: '<p>Das war\'s schon. Über <b>Tutorial</b> oben rechts gelangst du jederzeit zurück zu dieser Einführung.</p>'
  },

  // ============ Ebenen-/Gruppennamen im PSD- und SVG-Export =================
  // Diese Namen sieht niemand im Werkzeug selbst – sie erscheinen erst in
  // der Ebenenpalette von Photoshop bzw. als Objektname in Illustrator,
  // nachdem eine Datei aus dem Reiter „Vorlagen“ heruntergeladen wurde.
  ebenen: {
    hintergrund: 'Hintergrund (weiß)',
    foto: 'Foto',
    gruppeMaske: 'Maske',
    grundflaechePraefix: 'Grundfläche {{farbe}}',
    swooshKantePraefix: 'Swoosh-Kante {{farbe}}',
    gruppeKacheln: 'Kacheln',
    kachelPraefix: 'Kachel {{n}}',
    kachelBildZusatz: ' – Bild',
    kachelFarbeZusatz: ' – {{farbe}}',
    swooshInKachel: 'Swoosh in Kachel',
    swooshAufFoto: 'Swoosh auf Foto',
    gruppeIcon: 'Icon',
    iconKontur: 'Icon-Kontur (weiß)',
    iconFlaechePraefix: 'Icon-Fläche {{farbe}}',
    iconGlyphe: 'Icon-Glyphe'
  },

  // ========== Platzhalter-Inhalte in den Format-Vorschauen (rechts) ===========
  // Diese Texte tun nur so, als kämen sie aus dem echten Intranet (Über-
  // schriften, Namen, Zahlen) – sie erscheinen ausschließlich in den kleinen
  // Formatvorschauen rechts, niemals im exportierten Bild.
  platzhalter: {
    headlineZeile1: 'Lorem ipsum dolor sit amet',
    headlineZeile2: 'consetetur sadipscing elitr',
    headlineLang: 'Lorem ipsum dolor sit amet consetetur sadipscing elitr',
    headlineMittel: 'Lorem ipsum dolor sit amet consetetur',
    name: 'Max Mustermensch',
    metaVoll: 'in 2 Jahren | 94 Abrufe | 1 Reaktion',
    metaKurz: 'in 2 Jahren | 94 Abrufe',
    aufrufe: '362',
    reaktionen: '12',
    seite: '1 von 5',
    datum: 'Datum',
    datumVeranstaltung: 'Datum der Veranstaltung: 11 Sep.',
    missionName: 'Mission My-T',
    bereitsGelesen: 'Bereits gelesen',
    info: 'Info'
  }
};
