// Exact rectangular extraction from the original project sheets; no generated imagery.
// Coordinates refer to the review-size sheets below, scaled to the original pixels.
import sharp from 'sharp';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { validateState } from '../lib/content.mjs';

const definitions = [
  {
    id: 'bedrijfskantine', title: 'Bedrijfskantine', category: 'Interieurontwerp',
    source: 'bedrijfskantine pagina met tekst.png', size: [1504, 1648], coverSource: 'ba.jpg',
    description: `Voor deze opdracht heb ik een indeling gemaakt voor een bedrijfskantine. De klant had een aantal eisen: er moest een bar zijn, een biljarttafel, genoeg zitplekken, en het geheel moest een industriële stijl hebben.

Ik heb een ontwerp gemaakt met verschillende zitmogelijkheden, zoals hoge barkrukken bij de bar, comfortabele loungesets en tafels waar meerdere mensen kunnen zitten. De bar is een opvallend onderdeel in het ontwerp, met materialen zoals hout en metaal die perfect passen bij de industriële sfeer. De biljarttafel staat centraal in de ruimte, waardoor het een gezellige plek wordt waar mensen samenkomen.

Om de juiste sfeer te creëren, heb ik gekozen voor bakstenen muren, metalen accenten en industriële lampen. Ik heb het ontwerp gemaakt in SketchUp en de renders uitgewerkt met het renderprogramma Podium.

Dit project heeft me geleerd hoe ik een praktische en sfeervolle ruimte kan ontwerpen die voldoet aan de wensen van de klant.`,
    regions: [[7, 101, 729, 321, 'Render van de bar en zithoek'], [767, 101, 730, 321, 'Render van de lounge en biljarttafel'],
      [1074, 450, 361, 585, 'Plattegrond in 3D'], [1090, 1070, 341, 544, 'Plattegrond met indeling'], [174, 1146, 641, 451, 'Moodboard: materialen, meubels en verlichting']]
  },
  {
    id: 'bjorn-borg', title: 'Pop-up shop Björn Borg', category: 'Retail design',
    source: 'bjorn borg pop-up shop pagina met tekst.png', size: [700, 2048], coverSource: 'front renders.jpg',
    description: `Voor de eerste Björn Borg pop-up shop voor dameskleding en -ondergoed in de Benelux mocht ik het hele ontwerp bedenken.
Ik kreeg de vrijheid om alles zelf te bedenken, zolang het maar binnen de huisstijl van Björn Borg paste. Van het uitkiezen van meubels en het inrichten van de winkel tot het samenstellen van de collectie, alles heb ik zelf geregeld.

Met het programma SketchUp heb ik het ontwerp gemaakt en de renders heb ik gemaakt met Podium. Daarna stuurde ik de ontwerpen naar het team in Zweden voor feedback. Uiteindelijk is het gelukt om van mijn idee een echte winkel te maken.

Ik ben supertrots op hoe het eruit is komen te zien. Het was een leuke uitdaging om iets te ontwerpen dat niet alleen mooi is, maar ook goed werkt in het echt.

Dit is niet het enige project waaraan ik voor Björn Borg heb mogen meewerken. Hieronder vind je een selectie van andere modellen waar ik aan heb bijgedragen, waaronder het maken van renders en het uitwerken van ontwerpen.`,
    regions: [[17,135,344,196,'Render van het definitieve winkelontwerp'], [17,348,344,194,'Render van de collectiepresentatie'], [373,135,310,407,'De gerealiseerde pop-up shop'],
      [29,666,312,177,'Overig voorstel 1'], [359,666,312,177,'Overig voorstel 2'], [29,860,312,178,'Overig voorstel 3'], [359,860,312,178,'Overig voorstel 4'],
      [29,1434,311,176,'Ander project: winkelpresentatie'], [360,1434,311,176,'Ander project: Running Direct'], [29,1662,311,177,'Ander project: standontwerp'], [360,1662,311,177,'Ander project: stand in perspectief']]
  },
  {
    id: 'guess-display', title: 'Counter Display Guess', category: 'Productontwerp',
    source: 'guess display pagina met tekst2.png', size: [1500,1645], coverSource: 'project3.9.jpg',
    description: `Voor deze schoolopdracht ontwierp ik een toonbankdisplay voor een parfumflesje van Guess. Het ontwerp is geïnspireerd op het iconische Guess-logo en is zo gemaakt dat het eenvoudig in elkaar geklikt kan worden zonder lijm of schroeven.

Ik heb Adobe Illustrator en SketchUp gebruikt om het ontwerp te maken. In Illustrator maakte ik het snijbestand voor de lasersnijder, en in SketchUp werkte ik het 3D-model uit om te zien hoe alles in elkaar zou passen.

Het resultaat is een strak en opvallend display dat de aandacht trekt en het parfum mooi presenteert.`,
    regions: [[522,118,456,456,'Het afgewerkte Guess-display'], [828,643,303,294,'Vooraanzicht van het display'], [1153,643,303,294,'Zijaanzicht van het display'],
      [828,959,303,294,'Display in perspectief'], [1153,959,303,294,'Detail van de parfumhouder'], [128,1238,543,388,'Moodboard voor het Guess-display'], [828,1264,637,361,'Snijtekeningen voor de lasersnijder']]
  },
  {
    id: 'rave-run', title: 'Rave Run', category: 'Evenement',
    source: 'rave run pagina met tekst.png', size: [862,2048], coverSource: 'raverun front.jpg', video: 'img/raverunfilmpje.mp4',
    description: `Tijdens mijn stage heb ik samen met een andere stagiair bijna alles geregeld voor een festivalproject. We waren verantwoordelijk voor veel verschillende taken, zoals:

Het samenstellen van cadeaupakketjes voor de gasten.
Het regelen van outfits voor de influencers.
Het ontwerpen van het festivalterrein, inclusief de indeling.
Het huren van statafels, een DJ en foodtrucks om het festival compleet te maken.
Het inkopen en ophangen van alle versiering om de juiste sfeer neer te zetten.

Het was een leerzaam project waar we veel verantwoordelijkheid hadden. Ik ben trots op hoe we alles hebben geregeld en samen een professioneel en geslaagd evenement hebben neergezet.`,
    regions: [[163,154,527,352,'Björn Borg x Running Direct: Rave Run'], [545,551,280,210,'Ontvangst van de deelnemers'], [543,806,284,379,'Deelnemers op het festivalterrein'],
      [172,1225,518,724,'De originele uitnodiging voor de Rave Run']]
  },
  {
    id: 'happy-socks', title: 'Happy Socks', category: 'Fotografie & vormgeving',
    source: 'happy socks instagram post pagina.png', size: [1500,1645], coverSource: 'front socken.jpg',
    description: `Voor mijn examenopdracht Samenwerken heb ik samen met Kaitlyn ter Beek een Instagram post ontworpen voor Happy Socks. Onze opdracht was om een creatieve en opvallende post te maken die de Rolling Stones-themasokken promoot.

We hebben onze inspiratie gehaald uit de iconische albumcover van de Rolling Stones, waarop een bekladde wc te zien is. Dit thema hebben we vertaald naar een kleurrijk en speels beeld dat perfect aansluit bij de vrolijke en gedurfde stijl van Happy Socks. Door gebruik te maken van een oranje achtergrond en een spontane setting hebben we een opvallende post gemaakt die past bij de rock-'n-roll vibe van de sokken.

Deze opdracht liet ons niet alleen creatief nadenken, maar ook effectief samenwerken om een professioneel eindresultaat neer te zetten.`,
    regions: [[20,212,692,647,'Mock-up van de Instagram post'], [833,212,647,647,'De foto voor Happy Socks'], [1020,1070,460,483,'Inspiratie: de albumcover van The Rolling Stones']]
  },
  {
    id: 'lamp-design', title: 'Lamp Design', category: 'Productontwerp',
    source: 'lamp design pagina met tekst.png', size: [1312,1917], coverSource: 'lamp front.jpg',
    description: `Voor een schoolopdracht moesten we een lamp ontwerpen die professioneel oogt en klaar is voor verkoop. Mijn ontwerp is gebaseerd op het kleurthema van mijn kamer (zwart, geel en grijs) en mijn passie voor muziek. Hierdoor kwam ik op het idee om een LP-plaat als opvallend element te gebruiken.

De lamp bestaat uit:
Een LP-plaat: voor een unieke en vintage uitstraling.
Een dimbare lampbol: voor sfeervol en aanpasbaar licht.
Een vaas in de vorm van een theekop: ik heb het handvat afgezaagd, de randen netjes gevijld en alles geverfd zodat het bij het ontwerp past.

Ik ben trots op het resultaat, omdat het een mooie combinatie is van creativiteit en functionaliteit, en perfect in mijn kamer past.`,
    regions: [[175,187,432,576,'De lamp met een LP-plaat als kap'], [705,187,433,576,'Bovenaanzicht van de lamp'], [905,1274,261,544,'De lamp geïnstalleerd in mijn slaapkamer']]
  },
  {
    id: 'hotelkamer', title: 'Hotelkamer', category: 'Interieurontwerp',
    source: 'hotel kamer pagina met tekst.png', size: [700,2048], coverSource: 'hotelkamer front.jpg',
    description: `Voor deze schoolopdracht moest ik een hotelkamer ontwerpen. Ik kreeg een plattegrond met afmetingen aangeleverd en verder mocht ik zelf bepalen hoe ik de kamer wilde indelen en inrichten. Het was belangrijk dat het ontwerp functioneel was, maar ik wilde ook een moderne en leuke sfeer creëren.

Ik begon met een moodboard om de stijl en kleuren te bepalen. Ik koos voor een combinatie van neutrale tinten zoals grijs en wit, met warme accenten van hout en zwarte details voor een luxe uitstraling. Daarna werkte ik het ontwerp uit in 2 plattegronden en een 3D-model, zodat ik precies kon zien hoe alles eruit zou komen te zien.

Bij het indelen van de kamer heb ik geprobeerd om zoveel mogelijk ruimte te besparen zonder dat het krap aanvoelt. Er is een comfortabel bed, een zithoek, een werkplek en een badkamer.

Deze opdracht was leerzaam omdat ik creatief met de ruimte moest omgaan en het ontwerp praktisch en logisch moest maken. Ik ben tevreden omdat het eindresultaat de gewenste sfeer heeft en goed werkt.`,
    regions: [[166,47,368,163,'Render van de zithoek'], [25,220,319,142,'Render van het slaapgedeelte'], [354,220,320,142,'Render van de badkamer'], [190,372,319,141,'Render van de entree'],
      [410,672,276,192,'Conceptboard voor de hotelkamer'], [164,1037,371,213,'Plattegrond met indeling'], [147,1334,175,288,'De geleverde plattegrond'],
      [382,1334,171,288,'De aangepaste plattegrond'], [147,1706,175,285,'Voorstel indeling 1'], [382,1706,171,285,'Voorstel indeling 2 — de uiteindelijke keuze']]
  }
];
await mkdir('assets', { recursive: true });
await mkdir('content', { recursive: true });
let originalBytes = 0, optimizedBytes = 0;
const projects = [];
for (const d of definitions) {
  const source = `img/${d.source}`;
  const meta = await sharp(source, { limitInputPixels: 300000000 }).metadata();
  originalBytes += (await stat(source)).size;
  const images = [];
  for (const [i, [x, y, width, height, caption]] of d.regions.entries()) {
    const src = `assets/${d.id}-${i + 1}.webp`;
    const crop = { left: Math.round(x / d.size[0] * meta.width), top: Math.round(y / d.size[1] * meta.height),
      width: Math.round(width / d.size[0] * meta.width), height: Math.round(height / d.size[1] * meta.height) };
    await sharp(source, { limitInputPixels: 300000000 }).extract(crop).resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 }).toFile(src);
    optimizedBytes += (await stat(src)).size;
    images.push({ src, alt: caption, caption });
  }
  const cover = `assets/${d.id}-cover.webp`;
  await sharp(`img/${d.coverSource}`).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(cover);
  projects.push({ id: d.id, title: d.title, category: d.category, year: '', description: d.description, status: 'published', cover, images, video: d.video || '' });
}
await sharp('img/top.png').resize({ width: 600, withoutEnlargement: true }).webp({ quality: 85 }).toFile('assets/michelle.webp');
const timeline = [
  ['padelcentrum-bol','work','Kantinemedewerker','Padelcentrum Bol','september 2024 – heden'],
  ['talland','education','MBO 4 · Ruimtelijk Vormgever','Talland College','4 september 2022 – heden'],
  ['cambridge','education','Cambridge certificate C1','','15 juni 2024'],
  ['new-york-pizza','work','Keukenmedewerker','New York Pizza','juni 2023 – mei 2024'],
  ['dirk','work','Vakkenvuller','Dirk van den Broek','september 2022 – oktober 2023'],
  ['waterdam','work','Toezichthoudster & schoonmaakster','Zwembad De Waterdam','9 maart 2022 – 8 september'],
  ['don-bosco','education','Havo 3','Don Bosco College','2019 – 2022']
].map(([id,type,title,organization,period]) => ({ id,type,title,organization,period,description:'' }));
await writeFile('content/seed.json', JSON.stringify(validateState({ version: 1, projects, timeline }), null, 2) + '\n');
await writeFile('content/migration-report.json', JSON.stringify({ originalBytes, optimizedBytes, projects: projects.length, images: projects.reduce((n,p) => n + p.images.length, 0) }, null, 2) + '\n');
console.log(`Migrated ${projects.length} projects: ${(originalBytes/1048576).toFixed(1)} MB of sheets → ${(optimizedBytes/1048576).toFixed(1)} MB of separate images.`);
