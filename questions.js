// Quiz-Inhalt. Typen:
//   intro       – Startfolie (nur Moderation)
//   mc          – Multiple Choice, 4 Antworten, correct = Index 0..3
//                 optional: img (Bild über der Frage, z.B. "img/pizza.jpg"), audio (Dateiname in /audio), revealAudio, multiplier (z.B. 2 fürs Finale), category
//   interactive – Aufgabe, Punkte vergibt der Host per Klick (+30 / +15)
//   pause       – Pause mit Countdown (minutes) + Punktestand
//   standings   – Zwischenstand (Punkte werden NUR bei pause/standings/end angezeigt)
//   end         – Siegerehrung
// note = Moderationstext (nur im Moderator-Fenster / Notizen sichtbar, nicht für Teams).
window.QUIZ = {
  title: "Das große Team-Quiz",
  answerSeconds: 30,
  maxPoints: 30,
  wrongPoints: -5,
  interactivePoints: [30, 15],
  items: [
    {
      type: "intro",
      title: "Willkommen zum Team-Quiz!",
      text: "5 Teams · 30 Sekunden pro Frage · je schneller, desto mehr Punkte (30 → 0) · falsch: −5 · keine Antwort: 0",
      note: "Begrüßung, Regeln erklären, alle Teams per QR-Code einloggen lassen. Tipp: Gut zuhören lohnt sich – auch bei den Überleitungen!"
    },

    // ---------------- BLOCK 1 ----------------
    {
      type: "mc", category: "🎵 Song – nur 2 Sekunden!",
      q: "Welcher Song ist das?",
      audio: "blinding_lights.mp3",
      a: ["The Weeknd – Blinding Lights", "The Weeknd – Save Your Tears", "Dua Lipa – Levitating", "Harry Styles – As It Was"],
      correct: 0,
      explain: "Blinding Lights (2019) – einer der meistgestreamten Songs in der Geschichte von Spotify.",
      note: "Audio: nur die ersten ~2 Sekunden. Überleitung: „Von Synthie-Pop zu einer Technik, die heute jeder kennt …“"
    },
    {
      type: "mc", category: "Tech",
      q: "Wofür steht „GPT“ in ChatGPT?",
      img: "img/chatgpt.jpg",
      a: ["General Purpose Technology", "Generative Pre-trained Transformer", "Global Predictive Text", "Generated Personal Thinking"],
      correct: 1,
      explain: "Generative Pre-trained Transformer – „Transformer“ ist die Architektur, die Google 2017 vorgestellt hat.",
      note: "Überleitung: „Bevor die KI kam, gab es Katzenvideos. Und davor? Das allererste YouTube-Video.“"
    },
    {
      type: "mc", category: "Internet",
      q: "Was ist im allerersten YouTube-Video (2005) zu sehen?",
      img: "img/youtube.jpg",
      a: ["Eine Katze am Klavier", "Ein Typ vor Elefanten im Zoo", "Ein lachendes Baby", "Ein Skateboard-Unfall"],
      correct: 1,
      explain: "„Me at the zoo“ – YouTube-Mitgründer Jawed Karim vor den Elefanten im Zoo von San Diego, 19 Sekunden lang.",
      note: "Überleitung: „Hunger? Reden wir über die umstrittenste Pizza der Welt.“"
    },
    {
      type: "mc", category: "Essen",
      q: "In welchem Land wurde die Pizza Hawaii erfunden?",
      img: "img/pizza.jpg",
      a: ["USA (Hawaii)", "Kanada", "Italien", "Australien"],
      correct: 1,
      explain: "1962 in Chatham, Ontario (Kanada) – in einem Restaurant von Sam Panopoulos.",
      note: "WICHTIG für die Aufgepasst-Frage später – beiläufig erzählen: „Der Erfinder Sam Panopoulos war übrigens gebürtiger GRIECHE – ein Grieche erfindet in Kanada eine ‚hawaiianische‘ Pizza, die Italiener hassen. Völkerverständigung pur!“"
    },
    {
      type: "mc", category: "Serie",
      q: "In „Haus des Geldes“ tragen die Räuber Masken von welchem Künstler?",
      img: "img/banco.jpg",
      a: ["Pablo Picasso", "Salvador Dalí", "Frida Kahlo", "Vincent van Gogh"],
      correct: 1,
      explain: "Salvador Dalí – die Masken wurden danach zu einem weltweiten Protestsymbol.",
      note: "Überleitung: „Bleiben wir bei Bösewichten mit Maske … bzw. mit Schminke.“"
    },
    {
      type: "mc", category: "Film",
      q: "Welcher dieser Joker-Darsteller hat für die Rolle einen Oscar gewonnen?",
      img: "img/joker.jpg",
      a: ["Jack Nicholson", "Jared Leto", "Joaquin Phoenix", "Mark Hamill"],
      correct: 2,
      explain: "Joaquin Phoenix für „Joker“ (2019). Heath Ledger gewann ebenfalls (posthum, The Dark Knight) – stand aber nicht zur Wahl. Mark Hamill spricht den Joker in Animationsfilmen.",
      note: "Überleitung: „Oscars sind schön – aber was zählt an der Kinokasse?“"
    },
    {
      type: "mc", category: "Film",
      q: "Welcher Film hat weltweit am meisten an den Kinokassen eingespielt (nicht inflationsbereinigt)?",
      img: "img/kino.jpg",
      a: ["Avengers: Endgame", "Titanic", "Avatar (2009)", "Avatar: The Way of Water"],
      correct: 2,
      explain: "Avatar (2009) – rund 2,9 Mrd. US-Dollar, knapp vor Avengers: Endgame."
    },
    {
      type: "interactive",
      title: "🎯 Pantomime-Blitz!",
      text: "Jedes Team schickt eine Person nach vorne. Alle bekommen den GLEICHEN Filmtitel gezeigt und stellen ihn gleichzeitig pantomimisch für ihr eigenes Team dar. Das erste Team, das den Titel richtig ruft: +30, das zweite: +15.",
      note: "Filmtitel auf einen Zettel schreiben und den 5 Darstellern zeigen, z. B. „Titanic“, „Der weiße Hai“ oder „Fluch der Karibik“. Darsteller stellen sich vor ihr eigenes Team. Kein Sprechen, keine Geräusche!"
    },
    {
      type: "mc", category: "Schätzfrage",
      q: "Für wie viel wurde 2017 das teuerste Gemälde aller Zeiten versteigert (Leonardo da Vincis „Salvator Mundi“)?",
      img: "img/salvator.jpg",
      a: ["ca. 45 Mio. $", "ca. 120 Mio. $", "ca. 450 Mio. $", "ca. 1,2 Mrd. $"],
      correct: 2,
      explain: "450,3 Mio. US-Dollar bei Christie's – das Bild ist seitdem kaum öffentlich zu sehen.",
      note: "Überleitung: „Von teurer Kunst zu teurem Blech – mit Lizenz zum Töten.“"
    },
    {
      type: "mc", category: "🚗 BMW × Film",
      q: "In „GoldenEye“ (1995) fuhr James Bond erstmals einen BMW. Welches Modell war es?",
      img: "img/brosnan.jpg",
      a: ["BMW Z3", "BMW Z8", "BMW 750iL", "BMW M1"],
      correct: 0,
      explain: "Der BMW Z3 – Teil eines damals spektakulären Product-Placement-Deals. Danach folgten der 750iL (Der Morgen stirbt nie, 1997) und der Z8 (Die Welt ist nicht genug, 1999).",
      note: "Überleitung: „Bond hat immer einen eleganten Abgang. Ein Tier hat einen sehr … eckigen.“"
    },
    {
      type: "mc", category: "Tierisch",
      q: "Welches Tier produziert würfelförmigen Kot?",
      a: ["Faultier", "Wombat", "Gürteltier", "Koala"],
      correct: 1,
      explain: "Der Wombat – die Würfel rollen nicht weg und eignen sich so perfekt als Reviermarkierung."
    },
    {
      type: "mc", category: "Wissen mit Augenzwinkern",
      q: "Wofür steht der Name IKEA?",
      img: "img/ikea.jpg",
      a: ["Ingvar Kamprad + Hof + Dorf seiner Kindheit", "„Inredning Kvalitet Enkel Arkitektur“ (Einrichtung, Qualität, einfache Architektur)", "Die Initialen der vier Gründer", "Altschwedisch für „Gemütliches Heim“"],
      correct: 0,
      explain: "Ingvar Kamprad, Elmtaryd (Hof der Familie), Agunnaryd (Dorf in Småland).",
      note: "Überleitung: „Zeit fürs schwedische Möbel-Aufbauen? Nein – Zeit für 5 Minuten Pause!“"
    },
    {
      type: "pause",
      title: "☕ Pause",
      minutes: 5,
      note: "Zwischenstand wird angezeigt."
    },

    // ---------------- BLOCK 2 ----------------
    {
      type: "mc", category: "🎵 Film-Musik",
      q: "Aus welchem Film stammt dieses Stück?",
      audio: "inception_time.mp3",
      a: ["Interstellar", "Inception", "Dunkirk", "The Dark Knight"],
      correct: 1,
      explain: "Hans Zimmer – „Time“ aus Inception (2010). Alle vier Filme sind übrigens von Christopher Nolan.",
      note: "Audio: ca. 10 Sekunden. Überleitung: „Apropos Christopher Nolan …“"
    },
    {
      type: "mc", category: "Film",
      q: "Wie viele Oscars gewann Christopher Nolans „Oppenheimer“ 2024?",
      img: "img/oppenheimer.jpg",
      a: ["3", "5", "7", "11"],
      correct: 2,
      explain: "7 Oscars, u. a. Bester Film, Regie und Hauptdarsteller (Cillian Murphy).",
      note: "Überleitung: „Von der Atombombe zu einer Zeitmaschine mit Plutonium-Antrieb.“"
    },
    {
      type: "mc", category: "Film",
      q: "Welche Geschwindigkeit muss der DeLorean in „Zurück in die Zukunft“ erreichen, um durch die Zeit zu reisen?",
      img: "img/delorean.jpg",
      a: ["66 mph", "77 mph", "88 mph", "99 mph"],
      correct: 2,
      explain: "88 Meilen pro Stunde – ca. 142 km/h. „Great Scott!“",
      note: "Überleitung: „Zurück in die Gegenwart – und zur Sprache der Jugend.“"
    },
    {
      type: "mc", category: "Sprache & Internet",
      q: "Welcher Begriff wurde vom Oxford-Wörterbuch zum Wort des Jahres 2024 gewählt?",
      a: ["Rizz", "Brain rot", "Goblin mode", "Delulu"],
      correct: 1,
      explain: "„Brain rot“ – geistiger Verfall durch zu viel belanglosen Online-Content. „Rizz“ war 2023 dran, „Goblin mode“ 2022.",
      note: "Überleitung: „Von Brain rot zu einem echten Gehirn-Wurm … in Ohrwurm-Form.“"
    },
    {
      type: "mc", category: "Musik",
      q: "Wie viel spielte Taylor Swifts „Eras Tour“ (2023–2024) ungefähr ein?",
      img: "img/swift.jpg",
      a: ["ca. 200 Mio. $", "ca. 700 Mio. $", "ca. 2 Mrd. $", "ca. 5 Mrd. $"],
      correct: 2,
      explain: "Über 2 Mrd. US-Dollar – die erste Tour überhaupt, die diese Marke geknackt hat.",
      note: "Überleitung: „Und jetzt eine Legende – allerdings in die falsche Richtung.“"
    },
    {
      type: "mc", category: "🎵 Song – rückwärts!",
      q: "Welcher ABBA-Song ist das (rückwärts abgespielt)?",
      audio: "dancing_queen_rueckwaerts.mp3",
      revealAudio: "dancing_queen.mp3",
      a: ["Dancing Queen", "Mamma Mia", "Waterloo", "Take a Chance on Me"],
      correct: 0,
      explain: "Dancing Queen (1976).",
      note: "Audio: ca. 10 Sekunden Refrain rückwärts (Audacity: Effekt → Umkehren). Bei der Auflösung läuft er automatisch vorwärts."
    },
    {
      type: "mc", category: "Gaming",
      q: "Welches ist das meistverkaufte Videospiel aller Zeiten?",
      a: ["Minecraft", "GTA V", "Mario Kart 8", "Wii Sports"],
      correct: 0,
      explain: "Minecraft – über 300 Mio. verkaufte Exemplare. GTA V liegt auf Platz 2."
    },
    {
      type: "mc", category: "🎵 Song – 3 Sekunden",
      q: "Wer singt das?",
      audio: "flowers.mp3",
      a: ["Dua Lipa – Houdini", "Miley Cyrus – Flowers", "Taylor Swift – Anti-Hero", "Rita Ora – Anywhere"],
      correct: 1,
      explain: "Miley Cyrus – Flowers (2023), brachte ihr die ersten Grammys ihrer Karriere ein.",
      note: "Audio: ca. 3 Sekunden vom Strophenanfang (nicht den Refrain!)."
    },
    {
      type: "interactive",
      title: "🎯 Schnitzeljagd!",
      text: "Die gewählte Person bringt als Erste nach vorne: einen Schuh, eine 2-Euro-Münze, einen Kugelschreiber und ein Handyfoto, auf dem ein Tier zu sehen ist. Das Team darf suchen helfen, aber nur die gewählte Person darf laufen! 1. Platz: +30, 2. Platz: +15.",
      note: "Vollständigkeit prüfen, dann Punkte vergeben. Überleitung danach: „Genug gerannt – zurück auf die große Bühne.“"
    },
    {
      type: "standings",
      title: "📊 Zwischenstand – noch 3 Fragen!",
      text: "Jetzt wird's eng – im Finale gibt es doppelte Punkte.",
      note: "Spannung aufbauen: Wer kann noch aufholen?"
    },
    {
      type: "mc", category: "Musik",
      q: "Welches Land hat den Eurovision Song Contest 2024 gewonnen?",
      img: "img/malmo.jpg",
      a: ["Kroatien", "Schweiz", "Schweden", "Italien"],
      correct: 1,
      explain: "Die Schweiz mit Nemo und „The Code“ – Kroatien wurde Zweiter."
    },
    {
      type: "mc", category: "🧠 Aufgepasst!",
      q: "Aus welchem Land stammte der Erfinder der Pizza Hawaii ursprünglich?",
      img: "img/pizza.jpg",
      a: ["Italien", "Griechenland", "Kanada", "Libanon"],
      correct: 1,
      explain: "Sam Panopoulos war gebürtiger Grieche – das kam bei der Pizza-Frage vor. Wer aufgepasst hat, ist im Vorteil!"
    },
    {
      type: "mc", category: "🏁 FINALE – doppelte Punkte!",
      q: "Wie lautet der offizielle Weltrekord im Marathon der Männer?",
      a: ["1:59:40 h", "2:00:35 h", "2:01:09 h", "2:03:23 h"],
      correct: 1,
      multiplier: 2,
      explain: "2:00:35 h – Kelvin Kiptum, Chicago 2023. Die 1:59:40 von Eliud Kipchoge (2019) zählen nicht, weil Tempomacher rotierten. 2:01:09 war Kipchoges alter Rekord.",
      note: "Doppelte Punkte: 60 → 0, falsch −10. Danach: „Damit seid ihr im Ziel – ab zur Siegerehrung!“"
    },
    {
      type: "end",
      title: "🏆 Siegerehrung"
    }
  ]
};
