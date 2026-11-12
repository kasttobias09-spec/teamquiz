// Quiz-Inhalt. Typen:
//   intro       – Startfolie (nur Moderation)
//   mc          – Multiple Choice, 4 Antworten, correct = Index 0..3
//                 optional: img (Bild über der Frage, z.B. "img/pizza.jpg"), multiplier (z.B. 2 fürs Finale), category
//   interactive – Aufgabe, Punkte vergibt der Host per Klick (Standard +30 / +15; points: [30] = nur ein Sieger)
//   challenge   – Handy-Challenge: shakes× schütteln, dann holdSeconds ruhig halten; Platz 1/2 automatisch
//                 color = Farbjagd-Farbe (rot|blau|gruen|gelb, weglassen = keine Farbjagd), colorSeconds = Haltedauer
//                 stillMax = Wackel-Empfindlichkeit in m/s² (kleiner = strenger), practice: true = Testrunde ohne Punkte,
//                 cameraCheck: true = nach dem Test nur Kamerabild zeigen (keine Farbjagd)
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
      a: ["The Weeknd – Save Your Tears", "Dua Lipa – Levitating", "Harry Styles – As It Was", "The Weeknd – Blinding Lights"],
      correct: 3,
      explain: "Blinding Lights (2019) – einer der meistgestreamten Songs in der Geschichte von Spotify.",
      note: "🎤 Wir starten mit den Ohren – 2 Sekunden, mehr gibt's nicht. Wer erkennt den Hit? | 🎵 Vom Handy abspielen: nur die ersten ~2 Sekunden, direkt nach „Start“. Überleitung: „Von Synthie-Pop zu einer Technik, die heute jeder kennt …“"
    },
    {
      type: "mc", category: "Tech",
      q: "Wofür steht „GPT“ in ChatGPT?",
      img: "img/chatgpt.jpg",
      a: ["General Purpose Technology", "Generative Pre-trained Transformer", "Global Predictive Text", "Generated Personal Thinking"],
      correct: 1,
      explain: "Generative Pre-trained Transformer – „Transformer“ ist die Architektur, die Google 2017 vorgestellt hat.",
      note: "🎤 Jeder benutzt es, kaum einer weiß, wofür die drei Buchstaben stehen. | Überleitung: „Bevor die KI kam, gab es Katzenvideos. Und davor? Das allererste YouTube-Video.“"
    },
    {
      type: "mc", category: "Internet",
      q: "Was ist im allerersten YouTube-Video (2005) zu sehen?",
      img: "img/youtube.jpg",
      a: ["Eine Katze am Klavier", "Ein lachendes Baby", "Ein Typ vor Elefanten im Zoo", "Ein Skateboard-Unfall"],
      correct: 2,
      explain: "„Me at the zoo“ – YouTube-Mitgründer Jawed Karim vor den Elefanten im Zoo von San Diego, 19 Sekunden lang.",
      note: "🎤 Heute werden pro Minute Hunderte Stunden Video hochgeladen – aber womit fing alles an? | Überleitung: „Hunger? Reden wir über die umstrittenste Pizza der Welt.“"
    },
    {
      type: "mc", category: "Essen",
      q: "In welchem Land wurde die Pizza Hawaii erfunden?",
      img: "img/pizza.jpg",
      a: ["USA (Hawaii)", "Italien", "Australien", "Kanada"],
      correct: 3,
      explain: "1962 in Chatham, Ontario (Kanada) – in einem Restaurant von Sam Panopoulos.",
      note: "🎤 Ananas auf Pizza – die Frage spaltet Familien. Aber wo wurde dieses Verbrechen erfunden? | Fun Fact zum Erzählen: „Der Erfinder Sam Panopoulos war übrigens gebürtiger Grieche – ein Grieche erfindet in Kanada eine ‚hawaiianische‘ Pizza, die Italiener hassen. Völkerverständigung pur!“"
    },
    {
      type: "mc", category: "Serie",
      q: "In „Haus des Geldes“ tragen die Räuber Masken von welchem Künstler?",
      img: "img/banco.jpg",
      a: ["Salvador Dalí", "Pablo Picasso", "Frida Kahlo", "Vincent van Gogh"],
      correct: 0,
      explain: "Salvador Dalí – die Masken wurden danach zu einem weltweiten Protestsymbol.",
      note: "🎤 Eine der erfolgreichsten nicht-englischsprachigen Netflix-Serien – und ihre Masken kennt jeder. | Überleitung: „Bleiben wir bei Bösewichten mit Maske … bzw. mit Schminke.“"
    },
    {
      type: "mc", category: "Film",
      q: "Welcher dieser Joker-Darsteller hat für die Rolle einen Oscar gewonnen?",
      img: "img/joker.jpg",
      a: ["Jack Nicholson", "Jared Leto", "Mark Hamill", "Joaquin Phoenix"],
      correct: 3,
      explain: "Joaquin Phoenix für „Joker“ (2019). Heath Ledger gewann ebenfalls (posthum, The Dark Knight) – stand aber nicht zur Wahl. Mark Hamill spricht den Joker in Animationsfilmen.",
      note: "🎤 Kaum eine Rolle wurde so oft gespielt wie der Joker – aber nur wenige bekamen dafür Gold. | Bild der Spielkarte gut sichtbar stehen lassen (wird später abgefragt – nichts dazu sagen!). Überleitung: „Oscars sind schön – aber was zählt an der Kinokasse?“"
    },
    {
      type: "mc", category: "Film",
      q: "Welcher Film hat weltweit am meisten an den Kinokassen eingespielt (nicht inflationsbereinigt)?",
      img: "img/kino.jpg",
      a: ["Avengers: Endgame", "Avatar (2009)", "Titanic", "Avatar: The Way of Water"],
      correct: 1,
      explain: "Avatar (2009) – rund 2,9 Mrd. US-Dollar, knapp vor Avengers: Endgame.",
      note: "🎤 Milliarden-Hits gibt es einige – aber welcher Film steht ganz oben?"
    },
    {
      type: "interactive",
      title: "🎯 Pantomime-Blitz!",
      text: "Jedes Team schickt eine Person nach vorne. Alle bekommen den GLEICHEN Filmtitel gezeigt und stellen ihn gleichzeitig pantomimisch für ihr eigenes Team dar. Das erste Team, das den Titel richtig ruft, gewinnt: +30!",
      points: [30],
      note: "🎤 Jetzt seid ihr dran – ganz ohne Worte! Nur ein Team kann gewinnen. | Filmtitel auf einen Zettel schreiben und den 5 Darstellern zeigen, z. B. „Titanic“, „Der weiße Hai“ oder „Fluch der Karibik“. Darsteller stellen sich vor ihr eigenes Team. Kein Sprechen, keine Geräusche!"
    },
    {
      type: "mc", category: "Schätzfrage",
      q: "Für wie viel wurde 2017 das teuerste Gemälde aller Zeiten versteigert (Leonardo da Vincis „Salvator Mundi“)?",
      img: "img/salvator.jpg",
      a: ["ca. 120 Mio. $", "ca. 450 Mio. $", "ca. 900 Mio. $", "ca. 1,5 Mrd. $"],
      correct: 1,
      explain: "450,3 Mio. US-Dollar bei Christie's – das Bild ist seitdem kaum öffentlich zu sehen.",
      note: "🎤 Ein Bild, das jahrzehntelang als wertlose Kopie galt – und dann alle Rekorde brach. | Überleitung: „Von teurer Kunst zu teurem Blech – mit Lizenz zum Töten.“"
    },
    {
      type: "mc", category: "🚗 BMW × Film",
      q: "In „GoldenEye“ (1995) fuhr James Bond erstmals einen BMW. Welches Modell war es?",
      img: "img/brosnan.jpg",
      a: ["BMW Z8", "BMW 750iL", "BMW Z3", "BMW M1"],
      correct: 2,
      explain: "Der BMW Z3 – Teil eines damals spektakulären Product-Placement-Deals. Danach folgten der 750iL (Der Morgen stirbt nie, 1997) und der Z8 (Die Welt ist nicht genug, 1999).",
      note: "🎤 Ein Stück BMW-Geschichte – mit Lizenz zum Töten. | Überleitung: „James Bond schläft nie. Ein Tier dafür umso mehr …“"
    },
    {
      type: "mc", category: "Schätzfrage",
      q: "Wie viele Stunden schläft ein Koala durchschnittlich pro Tag?",
      a: ["ca. 8 Stunden", "ca. 12 Stunden", "ca. 15 Stunden", "ca. 20 Stunden"],
      correct: 3,
      explain: "18 bis 22 Stunden! Eukalyptusblätter liefern kaum Energie – also wird gespart, wo es geht.",
      note: "🎤 Wer ist heute schon müde? Es gibt ein Tier, das euch alle locker schlägt."
    },
    {
      type: "mc", category: "Wissen mit Augenzwinkern",
      q: "Wofür steht der Name IKEA?",
      img: "img/ikea.jpg",
      a: ["Ingvar Kamprad + Hof + Dorf seiner Kindheit", "„Inredning Kvalitet Enkel Arkitektur“ (Einrichtung, Qualität, einfache Architektur)", "Die Initialen der vier Gründer", "Altschwedisch für „Gemütliches Heim“"],
      correct: 0,
      explain: "Ingvar Kamprad, Elmtaryd (Hof der Familie), Agunnaryd (Dorf in Småland).",
      note: "🎤 Fast jeder hat ein Billy-Regal – aber wer kennt die Geschichte hinter dem Namen? | Überleitung: „Zeit fürs schwedische Möbel-Aufbauen? Nein – Zeit für 5 Minuten Pause!“"
    },
    {
      type: "pause",
      title: "☕ Pause",
      minutes: 5,
      note: "🎤 Halbzeit! 5 Minuten Pause – hier der Zwischenstand. Danach geht's mit Film und Musik weiter. | Zwischenstand wird angezeigt."
    },

    // ---------------- BLOCK 2 ----------------
    {
      type: "mc", category: "🎵 Film-Musik",
      q: "Aus welchem Film stammt dieses Stück?",
      a: ["Interstellar", "Dunkirk", "The Dark Knight", "Inception"],
      correct: 3,
      explain: "Hans Zimmer – „Time“ aus Inception (2010). Alle vier Filme sind übrigens von Christopher Nolan.",
      note: "🎤 Augen zu, Ohren auf – Filmmusik! | 🎵 Vom Handy abspielen: ca. 10 Sekunden, direkt nach „Start“. Überleitung: „Apropos Christopher Nolan …“"
    },
    {
      type: "mc", category: "Film",
      q: "Wie viele Oscars gewann Christopher Nolans „Oppenheimer“ 2024?",
      img: "img/oppenheimer.jpg",
      a: ["7", "9", "11", "13"],
      correct: 0,
      explain: "7 Oscars, u. a. Bester Film, Regie und Hauptdarsteller (Cillian Murphy).",
      note: "🎤 Der große Abräumer der Oscar-Nacht 2024. | Überleitung: „Von der Atombombe zu einer Zeitmaschine mit Plutonium-Antrieb.“"
    },
    {
      type: "mc", category: "Film",
      q: "Welche Geschwindigkeit muss der DeLorean in „Zurück in die Zukunft“ erreichen, um durch die Zeit zu reisen?",
      img: "img/delorean.jpg",
      a: ["66 mph", "77 mph", "88 mph", "99 mph"],
      correct: 2,
      explain: "88 Meilen pro Stunde – ca. 142 km/h. „Great Scott!“",
      note: "🎤 Ein Auto, das eigentlich ein Flop war – bis es durch die Zeit reiste. | Überleitung: „Zurück in die Gegenwart – und zur Sprache der Jugend.“"
    },
    {
      type: "mc", category: "Sprache & Internet",
      q: "Welcher Begriff wurde vom Oxford-Wörterbuch zum Wort des Jahres 2024 gewählt?",
      a: ["Rizz", "Goblin mode", "Brain rot", "Delulu"],
      correct: 2,
      explain: "„Brain rot“ – geistiger Verfall durch zu viel belanglosen Online-Content. „Rizz“ war 2023 dran, „Goblin mode“ 2022.",
      note: "🎤 Jedes Jahr kürt Oxford ein Wort, das unsere Zeit beschreibt – 2024 war es ziemlich ehrlich. | Überleitung: „Von Brain rot zu einem echten Gehirn-Wurm … in Ohrwurm-Form.“"
    },
    {
      type: "mc", category: "Musik",
      q: "Wie viel spielte Taylor Swifts „Eras Tour“ (2023–2024) ungefähr ein?",
      img: "img/swift.jpg",
      a: ["ca. 2 Mrd. $", "ca. 3 Mrd. $", "ca. 4,5 Mrd. $", "ca. 6 Mrd. $"],
      correct: 0,
      explain: "Über 2 Mrd. US-Dollar – die erste Tour überhaupt, die diese Marke geknackt hat.",
      note: "🎤 Die erfolgreichste Konzerttour aller Zeiten – aber wie viel kam da zusammen? | Überleitung: „Und jetzt eine Legende – allerdings in die falsche Richtung.“"
    },
    {
      type: "mc", category: "🎵 Song – rückwärts!",
      q: "Welcher Song ist das (rückwärts abgespielt)?",
      a: ["Coldplay – Fix You", "Coldplay – Viva la Vida", "Coldplay – Paradise", "Coldplay – Yellow"],
      correct: 1,
      explain: "Viva la Vida (2008) – bei den Grammys 2009 als „Song des Jahres“ ausgezeichnet.",
      note: "🎤 Jetzt wird's schwer: ein Welthit – rückwärts! | 🎵 Vom Handy abspielen: Viva la Vida RÜCKWÄRTS, ca. 10 Sekunden, direkt nach „Start“. Nach der Auflösung kurz vorwärts abspielen."
    },
    {
      type: "mc", category: "Gaming",
      q: "Welches ist das meistverkaufte Videospiel aller Zeiten?",
      a: ["GTA V", "Wii Sports", "Minecraft", "Mario Kart 8"],
      correct: 2,
      explain: "Minecraft – über 300 Mio. verkaufte Exemplare. GTA V liegt auf Platz 2.",
      note: "🎤 Welches Spiel hat sich am häufigsten verkauft? Nicht einfach das nehmen, was ihr selbst spielt!"
    },
    {
      type: "mc", category: "Serie",
      q: "In welcher Stadt spielt die Serie „Breaking Bad“?",
      a: ["Albuquerque", "Phoenix", "El Paso", "Las Vegas"],
      correct: 0,
      explain: "Albuquerque, New Mexico – Walter Whites Haus ist dort ein echtes Wohnhaus – die Besitzer mussten einen Zaun bauen, weil Fans Pizzen aufs Dach warfen (wie Walt in der Serie).",
      note: "🎤 Chemielehrer wird Drogenboss – aber wo spielt das Ganze? | Überleitung danach: „Zeit für Bewegung!“"
    },
    {
      type: "challenge",
      practice: true,
      title: "🧪 Testrunde – funktionieren eure Handys?",
      text: "Gleich kommt eine Handy-Challenge. Wir testen kurz, ob alles klappt: 3× schütteln, 3 Sekunden ruhig und flach halten – danach geht die Kamera an. Sagt Bescheid, ob ihr das Kamerabild seht! Keine Punkte – nur zum Ausprobieren.",
      shakes: 3,
      holdSeconds: 3,
      stillMax: 0.6,
      cameraCheck: true,
      note: "🎤 Handys raus – kurzer Technik-Check, keine Punkte! | Alle Teams: „Sensoren & Kamera freigeben“ antippen und BEIDE Abfragen erlauben. Nach dem Test zeigt jedes Handy das Kamerabild – Teams fragen, ob sie es sehen. Bei ⚠ oder ohne Kamerabild: anderes Handy nehmen. Dann weiter."
    },
    {
      type: "challenge",
      title: "📳 Schütteln · 🫗 Ruhige Hand · 🎨 Farbjagd",
      text: "Eine Person pro Team nimmt das Team-Handy. 1) 80× kräftig SCHÜTTELN. 2) Das Handy 8 Sekunden FLACH und RUHIG auf der ausgestreckten Hand halten – Wackeln = von vorne! 3) Mit der Kamera etwas in der angezeigten FARBE finden und 2 Sekunden draufhalten. Wer zuerst alles schafft: +30, Zweiter: +15.",
      shakes: 80,
      holdSeconds: 8,
      stillMax: 0.6,
      color: "rot",
      colorSeconds: 2,
      note: "🎤 Jetzt geht's um Geschick: schütteln, ruhig halten, suchen. Handy gut festhalten! | Freigaben gelten noch aus der Testrunde. Die Farbe (rot) erfahren die Teams erst in Stufe 3 – also vorher nicht verraten! Am Beamer siehst du, wer bereit ist. Handy GUT FESTHALTEN – Hinweis geben! Handy auf den Tisch legen gilt nicht (aufpassen). Platzierung wird automatisch vergeben, kann am Tablet korrigiert werden. Überleitung danach: „Genug gewackelt – zurück auf die große Bühne.“"
    },
    {
      type: "standings",
      title: "📊 Zwischenstand – noch 3 Fragen!",
      text: "Jetzt wird's eng – im Finale gibt es doppelte Punkte.",
      note: "🎤 Noch drei Fragen – und im Finale gibt's doppelte Punkte. Hier ist noch alles drin! | Spannung aufbauen: Wer kann noch aufholen?"
    },
    {
      type: "mc", category: "Musik",
      q: "Welches Land hat den Eurovision Song Contest 2024 gewonnen?",
      img: "img/malmo.jpg",
      a: ["Kroatien", "Schweden", "Schweiz", "Italien"],
      correct: 2,
      explain: "Die Schweiz mit Nemo und „The Code“ – Kroatien wurde Zweiter.",
      note: "🎤 Der ESC 2024 in Malmö war voller Überraschungen – wer hat gewonnen?"
    },
    {
      type: "mc", category: "🧠 Aufgepasst!",
      q: "Bei der Joker-Frage war eine Spielkarte zu sehen. Was stand unten auf der Karte?",
      a: ["JOKER", "THE FOOL", "JOLLY JOKER", "THE JOLLY"],
      correct: 3,
      explain: "„THE JOLLY“ – eine italienische Joker-Karte. Wer bei den Bildern genau hingeschaut hat, ist im Vorteil!",
      note: "🎤 Jetzt zeigt sich, wer wirklich aufgepasst hat … | Bild NICHT nochmal zeigen. Bei der Auflösung darfst du verraten: Auch Bilder können später wichtig werden."
    },
    {
      type: "mc", category: "🏁 FINALE – doppelte Punkte!",
      q: "Wie lautet der offizielle Weltrekord im Marathon der Männer?",
      a: ["1:59:40 h", "2:00:35 h", "2:01:09 h", "2:03:23 h"],
      correct: 1,
      multiplier: 2,
      explain: "2:00:35 h – Kelvin Kiptum, Chicago 2023. Die 1:59:40 von Eliud Kipchoge (2019) zählen nicht, weil Tempomacher rotierten. 2:01:09 war Kipchoges alter Rekord.",
      note: "🎤 Das große Finale – doppelte Punkte, doppelter Druck! Vorsicht, hier lauern Fallen. | Doppelte Punkte: 60 → 0, falsch −10. Danach: „Damit seid ihr im Ziel – ab zur Siegerehrung!“"
    },
    {
      type: "end",
      title: "🏆 Siegerehrung",
      note: "🎤 Trommelwirbel! Platzierungen von hinten nach vorne vorlesen, Applaus für alle Teams."
    }
  ]
};
