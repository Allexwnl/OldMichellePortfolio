# Michelle Jonk — portfolio

Portfolio met een Nederlandstalig beheer voor projecten en een tijdlijn met opleidingen en werkervaring. De bestaande zeven projecten zijn overgezet van grote samengestelde afbeeldingen naar echte tekst en losse WebP-afbeeldingen.

**Begin met [SETUP.md](SETUP.md)** voor de eenmalige koppeling met Firebase, een privé GitHub-inhoudsrepository en Netlify. De accounts zijn nog niet aangemaakt of gekoppeld.

## Lokaal bekijken

Gebruik Node.js 22 of nieuwer:

```sh
npm ci
npm run build
npm run preview
```

Website: `http://127.0.0.1:4173` · Beheer: `http://127.0.0.1:4173/admin.html`

Het beheer gebruikt Firebase Google-login met twee toegestane e-mailadressen. Zonder accountconfiguratie toont het een installatiekaart. De lokale statische preview heeft geen backend; gebruik Netlify Dev of de Netlify-site voor echte login en publicatie.

## Inhoud beheren

Open `/admin.html` om projecten, afbeeldingen, tekst en tijdlijnitems te bewerken. Afbeeldingen uploaden, uitsnijden, herschikken, omslagen kiezen, voorbeelden bekijken, concepten opslaan en publiceren kan daar. Je hoeft geen nieuwe HTML-pagina's of entries in `cards.json` meer aan te maken.

De publieke website gebruikt `portfolio.json`, dat tijdens de build wordt gemaakt. Concepten staan uitsluitend in de privé-inhoudsrepository. GitHub-tokens en de Netlify-build-hook blijven op de server. Alleen de Firebase-webconfiguratie gaat naar de browser.

## Ontwikkelen en controleren

```sh
npm test
npx playwright install chromium
npx playwright test
```

De browsertests gebruiken een test-only Firebase-vervanger en gemockte API-verzoeken. Ze maken geen echte GitHub-commits of Netlify-deploys. Een geïnstalleerde Chrome kan worden gekozen met `PLAYWRIGHT_CHROME_PATH`.

- `src/`: publieke weergave en beheerinterface.
- `lib/`: servervalidatie, authenticatie en GitHub-opslag.
- `netlify/functions/admin.mjs`: afgeschermde beheer-API.
- `content/seed.json`: gemigreerde begininhoud.
- `assets/`: uitgeknipte, geoptimaliseerde bestaande afbeeldingen.
- `scripts/build.mjs`: publiceert uitsluitend benodigde websitebestanden naar `dist/`.
- `scripts/migrate.mjs`: reproduceert de bestaande uitsneden en begininhoud vanuit `img/`.

De oorspronkelijke projectpagina's en afbeeldingen blijven in de repository als bronmateriaal. De build maakt de oude project-URL's opnieuw met de nieuwe weergave.
