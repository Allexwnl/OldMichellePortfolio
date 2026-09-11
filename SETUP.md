# Portfolio van Michelle — eenmalig instellen

De website en het Nederlandstalige beheer zijn gebouwd. De drie externe accounts moeten nog worden aangemaakt en gekoppeld. Er is niets automatisch naar GitHub gepusht of online gepubliceerd.

## 1. GitHub: code en privé-inhoud

Gebruik de repository `Allexwnl/OldMichellePortfolio` voor de websitecode. Dit project wordt op Alexanders account voortgezet; de oorspronkelijke repository van Michelle blijft behouden. Commit en push de nieuwe bestanden, inclusief `assets/`, `content/seed.json`, `package.json`, `package-lock.json`, `netlify.toml`, `lib/`, `src/`, `scripts/` en `netlify/`. Commit geen `.env`, tokens, `node_modules` of `dist`.

Maak daarnaast een **privérepository** voor de inhoud, bijvoorbeeld `michelle-portfolio-content`. Kies bij het aanmaken **Add a README file**, zodat de branch `main` bestaat. Houd deze repository apart van de websitecode: concepten blijven dan privé en een concept opslaan start geen websitebuild.

Maak in GitHub een fine-grained personal access token, alleen voor deze privérepository, met **Contents: Read and write** (Metadata wordt automatisch toegevoegd). Bewaar de token in Netlify als `GITHUB_CONTENT_TOKEN`. Noteer de vervaldatum; vernieuw de token daar wanneer nodig. Zet bij `GITHUB_CONTENT_REPO` de volledige naam, bijvoorbeeld `michellejonk/michelle-portfolio-content`.

Bij de eerste keer opslaan maakt het beheer `state.json` aan met de bestaande projecten. Nieuwe afbeeldingen verschijnen als `media/<hash>.webp`. Bij publiceren komt er ook een `published.json` met alleen de zichtbare projecten en de tijdlijn. De bestaande uitgeknipte afbeeldingen staan in `assets/` in de coderepository; beide soorten worden vanuit GitHub in de Netlify-build opgenomen.

## 2. Firebase: Google-login

1. Maak een Firebase-project en registreer daarin een web-app.
2. Open **Authentication → Sign-in method**, schakel **Google** in en kies een support-e-mailadres.
3. Kopieer uit de web-appconfiguratie `apiKey`, `authDomain`, `projectId` en `appId` naar de overeenkomstige Netlify-variabelen hieronder. Deze vier webconfiguratiewaarden zijn openbaar; een service-account/private key is niet nodig.
4. Voeg onder **Authentication → Settings → Authorized domains** het uiteindelijke Netlify-domein toe, bijvoorbeeld `michelle-portfolio.netlify.app`. Voeg ook je eigen domein toe als je dat gebruikt. Voor lokaal inloggen voeg je `localhost` toe.

De server verifieert de ondertekende Firebase ID-token, de project-ID, geldigheid, geverifieerde e-mail en Google als provider. Alleen `alexanderzoet@gmail.com` en `michellejonk17@gmail.com` krijgen beheerrechten via `ADMIN_EMAILS`. Andere Google-accounts kunnen eventueel als gebruiker in Firebase Authentication verschijnen, maar krijgen **geen toegang tot inhoud, afbeeldingen, opslaan of publiceren**. Er is geen openbare database of client-side GitHub-token.

Firebase wordt alleen voor authenticatie gebruikt. Firestore en Firebase Storage zijn niet nodig.

## 3. Netlify: website koppelen

1. Maak een Netlify-project via **Import an existing project** en selecteer `Allexwnl/OldMichellePortfolio` als repository met de websitecode.
2. Als deze portfolio zelf de root van de GitHub-repository is: laat **Base directory leeg**. Alleen als je de hele development-start-repository koppelt, gebruik je `michelle/persoonlijk-portfolio` als base directory.
3. Build command: `npm run build`. Publish directory: `dist`. De functions directory staat al in `netlify.toml`.
4. Voeg onderstaande environment variables toe in Netlify. Kies waar beschikbaar de scope **Builds and Functions**. Geheimen mogen uitsluitend in Netlify staan; niet in de broncode of publieke configuratie.

| Variabele | Waarde |
| --- | --- |
| `FIREBASE_API_KEY` | Firebase webconfiguratie: `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | Firebase webconfiguratie: `authDomain` |
| `FIREBASE_PROJECT_ID` | Firebase webconfiguratie: `projectId` |
| `FIREBASE_APP_ID` | Firebase webconfiguratie: `appId` |
| `ADMIN_EMAILS` | `alexanderzoet@gmail.com,michellejonk17@gmail.com` |
| `GITHUB_CONTENT_REPO` | `eigenaar/naam-van-privérepository` |
| `GITHUB_CONTENT_BRANCH` | `main` |
| `GITHUB_CONTENT_TOKEN` | De beperkte GitHub-token |
| `NETLIFY_BUILD_HOOK` | De build-hook-URL uit de volgende stap |

5. Maak onder **Build & deploy → Build hooks** een hook voor de productiebranch van de **coderepository**. Sla de URL op als `NETLIFY_BUILD_HOOK`. Deze URL is geheim.
6. Start een nieuwe production deploy om de instellingen te activeren. Voeg het uiteindelijke domein ook toe aan de Firebase authorized domains.
7. Open `https://jouw-site.netlify.app/admin.html`, log in met een van jullie twee accounts en test concept opslaan. Publiceer vervolgens en wacht op **“Je wijzigingen staan live!”**.

Gebruik het beheer op de productie-URL. Een deploy-preview van een andere branch heeft zijn eigen publieke JSON en is daarom niet geschikt om een productiepublicatie te controleren. Verander je environment variables, voer dan een nieuwe deploy uit.

## Dagelijks gebruik

- **Projecten:** voeg een project toe, bewerk titel, categorie, periode en tekst, upload afbeeldingen en kies een omslag. Voeg bijschriften en afbeeldingsomschrijvingen toe. Verplaats afbeeldingen en projecten met de pijltjes.
- **Uitsnede uit projectpagina:** open een gecombineerde afbeelding, sleep een rechthoek of vul percentages in, klik op *Uitsnede toevoegen* en herhaal voor de andere foto's. De originele pixels worden uitgesneden, niet opnieuw gegenereerd. Tekst voeg je zelf toe in het tekstveld; automatische OCR is niet ingebouwd.
- **Zichtbaarheid:** een nieuw project begint als concept. Kies *Zichtbaar op de website* als het klaar is.
- **Tijdlijn:** kies opleiding of werkervaring en vul titel, organisatie, periode en eventueel een toelichting in. De pijlen bepalen de volgorde.
- **Concept opslaan:** bewaart de volledige werkversie privé in GitHub. De huidige liveversie blijft staan, ook als je een bestaand gepubliceerd project hebt bewerkt.
- **Wijzigingen publiceren:** slaat alles op en maakt een publieke versie van de zichtbare projecten en de tijdlijn. Alle wijzigingen in deze werksessie worden tegelijk gepubliceerd, inclusief verwijderingen.
- Een indicator toont opslaan/uploaden/bouwen. De groene bevestiging verschijnt pas zodra de gepubliceerde versie daadwerkelijk op de website wordt teruggelezen. Na vijf minuten zonder bevestiging wordt een duidelijke melding met een herstartknop getoond. Controleer bij een buildfout de Netlify-deploylog. De opgeslagen inhoud gaat niet verloren.

Open bij voorkeur één beheertab tegelijk. Bij gelijktijdige wijzigingen weigert de server een verouderde versie te overschrijven. Kopieer in dat geval je nog niet opgeslagen tekst en herlaad het beheer. Verwijderde afbeeldingen blijven in de privé Git-geschiedenis; het beheer voert geen destructieve repository-opruiming uit.

## Bestaande inhoud en snelheid

Alle zeven projectpagina's zijn overgezet naar echte tekst en afzonderlijke afbeeldingen. De oorspronkelijke bestanden in `img/` blijven bewaard. Oude projectlinks werken ook in de gebouwde website. Overlappende moodboards en de Rave Run-uitnodiging blijven één afbeelding omdat zij zelf het ontwerp tonen; de projectbeschrijvingen zijn wel bewerkbaar.

Controleer de overgenomen tekst en datums. De oorspronkelijke tijdlijn vermeldt bij Talland nog *heden*, terwijl de introductie zegt dat de opleiding afgerond is. Bij Waterdam ontbreekt het jaar van de einddatum. Er zijn geen datums verzonnen.

Afbeeldingen worden als WebP opgeslagen, met kleinere 640- en 1280-pixelvarianten voor bezoekers. Nieuwe uploads worden vóór het versturen verkleind tot maximaal 2000 pixels en 2 MB. De grote originele projectpagina's gaan niet mee in de gepubliceerde website. Afbeeldingen buiten beeld laden pas wanneer nodig. De bestaande achtergrondvideo van 26 MB start nu via *Animatie afspelen*, zodat deze niet ieder eerste bezoek vertraagt. De Rave Run-video laadt ook pas bij afspelen.

GitHub is opslag en versiebeheer; bezoekers ontvangen bestanden via Netlify. GitHub-opslag is niet onbeperkt. Hosting, builds en bandbreedte vallen onder de gekozen Netlify- en Firebase-plannen.

## Lokaal controleren

Vereist: Node.js 22 of nieuwer.

```sh
npm ci
npm test
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Zonder Firebase-configuratie toont het beheer de installatiekaart. Deze statische preview bevat geen Netlify Functions en kan dus niet inloggen of publiceren. Gebruik daarvoor Netlify Dev met de environment variables, of de gekoppelde Netlify-site. Een `.env`-bestand wordt niet automatisch door het buildscript ingelezen; stel de variabelen in de shell in of gebruik Netlify Dev.

`npm run migrate` maakt de bestaande uitsneden en seed-inhoud opnieuw vanuit de originele afbeeldingen. Dit is een onderhoudstaak en overschrijft de lokale migratiebestanden. Normale builds gebruiken de al gegenereerde assets.

## Documentatie

- [Firebase Google-login](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase ID-tokens op de server verifiëren](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [GitHub fine-grained tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Netlify environment variables voor functions](https://docs.netlify.com/build/functions/environment-variables/)
- [Netlify build hooks](https://docs.netlify.com/build/configure-builds/build-hooks/)
