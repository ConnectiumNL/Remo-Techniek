# Remo Techniek — Cursusmateriaal PWA

Progressive Web App voor het bekijken van cursusmateriaal op kiosk-tablets bij Remo West-Twente (ROC). Gebruikers loggen automatisch in via Microsoft (SSO), bladeren door SharePoint-mappen en openen PDF- en afbeeldingsbestanden direct in de app.

---

## Inhoudsopgave

1. [Overzicht](#overzicht)
2. [Functies](#functies)
3. [Technologie](#technologie)
4. [Architectuur](#architectuur)
5. [Azure AD configuratie](#azure-ad-configuratie)
6. [SharePoint configuratie](#sharepoint-configuratie)
7. [Installatie & deployment](#installatie--deployment)
8. [Configuratie](#configuratie)
9. [PWA & service worker](#pwa--service-worker)
10. [Beheer](#beheer)

---

## Overzicht

De app is bedoeld voor vaste Android-tablets die via **Microsoft Intune** als Managed Google Play Web App zijn uitgerold. Leerlingen en docenten openen de app, worden transparant via SSO ingelogd en zien direct de mappen en bestanden uit SharePoint.

```
Tablet (Edge/Intune) → GitHub Pages / nginx → MSAL SSO → Microsoft Graph → SharePoint
```

---

## Functies

| Functie | Details |
|---|---|
| Automatisch inloggen | MSAL `ssoSilent` → `loginRedirect` fallback |
| Mapnavigatie | Broodkruimelpad, pull-to-refresh |
| PDF-viewer | Volledig in-app, paginanavigatie, tekstlaag |
| PDF zoeken | Volledig tekst zoeken met markering en navigatie |
| PDF inhoudsopgave | Automatisch ingeladen uit PDF-metadata |
| PDF zoom | Knoppen (+/−) in stappen van 10%, knijpen real-time, tik % → reset |
| Vloeiende zoom | CSS `zoom` + `requestAnimationFrame` ease-in-out animatie |
| Paginateller | `X / N` live bijgewerkt tijdens scrollen |
| Afbeeldingsviewer | JPEG, PNG, WebP, GIF, BMP |
| Miniaturen | SharePoint Graph thumbnail API |
| Service worker | Offline-capable, `skipWaiting` + `clients.claim()` voor directe updates |
| SEO-blokkering | `robots.txt` + meta-tags blokkeren alle bekende crawlers en AI-bots |
| Geen indexering | `noindex, nofollow` voor Google, Bing, GPTBot, ClaudeBot, CCBot, enz. |

---

## Technologie

| Onderdeel | Versie / details |
|---|---|
| **MSAL.js** | v2.38.3 via CDN (`@azure/msal-browser`) |
| **PDF.js** | v3.11.174 via CDN (Cloudflare) |
| **Microsoft Graph API** | v1.0, `Sites.Read.All` + `Files.Read.All` |
| **Hosting productie** | GitHub Pages (`https://connectiumnl.github.io/Remo-Techniek/`) |
| **Hosting lokaal/test** | Docker `nginx:alpine` op `https://192.168.1.137:8443/` |
| **Uitrol op tablets** | Microsoft Intune — Managed Google Play Web App |

---

## Architectuur

### Bestandsstructuur

```
Remo-Techniek/
├── index.html          # Volledige PWA (één bestand)
├── sw.js               # Service worker
├── manifest.json       # PWA-manifest
├── robots.txt          # Blokkeer crawlers
└── icons/
    ├── favicon.ico
    ├── favicon-16x16.png
    ├── favicon-32x32.png
    ├── apple-touch-icon.png
    ├── icon-folder.svg
    ├── icon-pdf.svg
    └── icon-image.svg
```

### Paginaflow

```
App start
  └─ init()
       ├─ handleRedirectPromise()   ← vangt SSO-redirect terug
       ├─ getAllAccounts()
       │    └─ account gevonden → boot()
       └─ ssoSilent()
            ├─ geslaagd → boot()
            └─ mislukt → login-scherm tonen → loginRedirect()

boot()
  ├─ Graph: site-id ophalen
  ├─ Graph: drives ophalen → "Gedeelde documenten" / "Documents"
  ├─ Graph: root-map ophalen (ROOT_PATH)
  └─ loadFolder(rootId)

loadFolder(id)
  ├─ Graph: children?$expand=thumbnails&$orderby=name
  ├─ sessionStorage bijwerken (crumbs)
  └─ renderContent()
```

### PDF-renderarchitectuur

```
openPdf(url, name)
  ├─ PDF laden via fetch() → ArrayBuffer → pdfjsLib.getDocument()
  ├─ pdfFitScale berekenen op basis van schermebreedte
  └─ renderPages()

renderPages()                     ← volledig herbouwen bij zoom
  ├─ canvas per pagina renderen op pdfScale
  ├─ textLayer per pagina toevoegen (voor zoeken + selectie)
  └─ scrollIntoView() naar currentPage

zoomPdf(dir)                      ← knoppen / tik %
  ├─ pdfScale aanpassen (stappen van 10%, snap)
  ├─ animZoom() CSS zoom-animatie (220ms ease-in-out)
  └─ renderPages() na animatie

Pinch-zoom (touchmove)
  ├─ pdfScaler.style.zoom = pdfScale / pdfRenderScale  ← real-time
  └─ renderPages() 150ms na touchend
```

---

## Azure AD configuratie

### App-registratie

1. Ga naar [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App-registraties** → **Nieuwe registratie**
2. Naam: bijv. `Remo Techniek PWA`
3. Ondersteunde accounttypen: `Accounts in deze organisatiemap alleen`
4. Omleidings-URI: **Single-page application (SPA)**
   - Productie: `https://connectiumnl.github.io/Remo-Techniek/`
   - Lokaal/test: `https://192.168.1.137:8443/`

### API-machtigingen

Voeg de volgende **gedelegeerde** machtigingen toe onder **Microsoft Graph**:

| Machtiging | Waarvoor |
|---|---|
| `Sites.Read.All` | SharePoint-site en drives ophalen |
| `Files.Read.All` | Mappen, bestanden en miniaturen ophalen |

Klik op **Beheerderstoestemming verlenen** zodat gebruikers niet zelf hoeven in te stemmen.

### Waarden overnemen

Na het aanmaken:
- **Toepassings-id (client-id)** → `CLIENT_ID` in `index.html`
- **Map-id (tenant-id)** → `TENANT_ID` in `index.html`

---

## SharePoint configuratie

De app leest één vaste mapstructuur. Configureer de locatie in `index.html`:

```javascript
const SITE_HOST = "remotechniek.sharepoint.com";   // SharePoint-domein
const SITE_PATH = "/sites/COVakmanschap";           // Sitecollectie
const ROOT_PATH = "Tablets/Vakmanschap CO";         // Beginmap (relatief aan Documents)
```

De app zoekt de documentenbibliotheek op naam: `Gedeelde documenten`, `Documents` of `Documenten`.

Zorg dat alle tabletgebruikers (of de groep waaraan de app-registratie is verleend) **leesbevoegdheid** hebben op de site en de map.

---

## Installatie & deployment

### GitHub Pages (productie)

De app staat op `main` en wordt automatisch gepubliceerd via GitHub Pages.

```
https://connectiumnl.github.io/Remo-Techniek/
```

Wijzigingen pushen:
```bash
git push origin main
```
GitHub Pages publiceert binnen 1–2 minuten. De service worker dwingt bij de volgende pageload de nieuwe versie af (`skipWaiting` + `clients.claim()`).

### Docker (lokaal / test)

Vereisten: Docker, SSH-toegang tot `192.168.1.137`.

```bash
# 1. Patch CDN-paden naar lokale paden
sed 's|https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js|/libs/msal-browser.min.js|g; \
     s|https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js|/libs/pdf.min.js|g; \
     s|https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js|/libs/pdf.worker.min.js|g' \
     index.html > index_docker.html

# 2. Kopieren naar server
scp -i ~/.ssh/id_ed25519 index_docker.html root@192.168.1.137:/var/www/html/index.html
scp -i ~/.ssh/id_ed25519 sw.js root@192.168.1.137:/var/www/html/sw.js

# 3. Controleer in browser
# https://192.168.1.137:8443/
```

De Docker-container draait `nginx:alpine` met zelfondertekend TLS-certificaat. Lokale bibliotheken (`msal-browser.min.js`, `pdf.min.js`, `pdf.worker.min.js`) staan in `/var/www/html/libs/`.

### Tablets uitrollen via Intune

1. Intune → **Apps** → **Toevoegen** → **Web-app (Android)**
2. URL: `https://connectiumnl.github.io/Remo-Techniek/`
3. Weergeven als PWA: **Ja**
4. Wijs toe aan de apparaatgroep van de tablets

De app opent in Edge (Intune managed) als een volledig scherm-app.

---

## Configuratie

Alle configuratie staat als constanten bovenaan het `<script>`-blok in `index.html`. Het bestand staat in een **publieke** repository — sla hier **geen geheimen** op.

```javascript
const CLIENT_ID = "...";          // Azure AD app-registratie client-id
const TENANT_ID = "...";          // Azure AD tenant-id
const SITE_HOST = "...";          // SharePoint-domein
const SITE_PATH = "...";          // SharePoint-sitecollectie
const ROOT_PATH = "...";          // Beginmap in documentenbibliotheek
```

Deze waarden zijn niet geheim: client-id en tenant-id zijn zichtbaar in de browser voor elke aangemelde gebruiker. De beveiliging zit in de **Azure AD-machtigingen** en de **Intune-apparaatbeheer**.

---

## PWA & service worker

### Cachestrategie (`sw.js`)

| Verzoektype | Strategie |
|---|---|
| HTML-navigatie (`navigate`) | Network-first, fallback cache |
| Lokale statische bestanden (icons, manifest) | Cache-first, update op achtergrond |
| Extern (CDN, Graph API, SharePoint) | Altijd netwerk, nooit cachen |

### Updates forceren

De service worker gebruikt `skipWaiting()` bij installatie en `clients.claim()` bij activering. Dat betekent: na een deployment is de nieuwe versie **bij de volgende pageload direct actief** — zonder dat de gebruiker hoeft te vernieuwen of de cache te wissen.

Als een tablet de update toch niet oppikt:
1. Open Edge → Instellingen → Privacy en beveiliging → Browsegegevens wissen
2. Selecteer **Gecachte afbeeldingen en bestanden** + **Cookies** → Wissen
3. App opnieuw openen

> Let op: Edge op Intune-beheerde apparaten bewaart werkgegevens in een afgeschermd profiel. Gegevens wissen via Android-systeeminstellingen (→ App) raakt alleen het persoonlijke profiel — gebruik altijd het wissen **binnen Edge zelf**.

---

## Beheer

### Bestanden toevoegen of verplaatsen

Plaats bestanden in de SharePoint-map `Tablets/Vakmanschap CO` (of submappen). De app herlaadt de mapinhoud bij elke navigatiestap en bij pull-to-refresh.

Ondersteuning bestandstypen:
- **PDF** — volledig in-app viewer
- **Afbeeldingen** — JPEG, PNG, WebP, GIF, BMP
- Overige bestandstypen worden wel getoond maar kunnen niet worden geopend

### Gebruikers/toegang

Toegang wordt volledig beheerd via SharePoint-permissies en Azure AD. Geen aparte gebruikersadministratie in de app nodig.

### Cache wissen op tablet (bij problemen)

1. Open Edge op de tablet
2. Menu (···) → Instellingen → Privacy en beveiliging → Browsegegevens wissen
3. Kies: Gecachte afbeeldingen en bestanden
4. Tik op Wissen
5. Herlaad de app
