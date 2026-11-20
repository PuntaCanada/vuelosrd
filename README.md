# VuelosRD ✈️

Portal piloto multilingüe de aeropuertos y seguimiento de vuelos de la República Dominicana.

## Estado
**Piloto estático:** no hay datos de vuelos en directo propios. Los botones de llegadas, salidas y seguimiento abren Flightradar24, un proveedor externo. VuelosRD **no confirma** horarios, retrasos, cancelaciones ni posiciones en directo. No se copian ni se extraen automáticamente datos ajenos.

## Características
- 5 idiomas: español, inglés, alemán, francés y kreyòl ayisyen.
- 7 aeropuertos: PUJ, SDQ, STI, POP, LRM, AZS, JBQ.
- Búsqueda de número de vuelo para abrir un enlace externo.
- Hora de Santo Domingo con `Intl.DateTimeFormat`.
- Diseño responsive, accesible, sin framework ni proceso de compilación.
- Sin cookies de seguimiento, sin analítica, sin credenciales ni servidor.
- Preferencia de idioma únicamente en `localStorage`.

## Publicar gratis en Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Selecciona `PuntaCanada/vuelosrd`, branch `main`.
3. Framework preset: **None**; build command: **vacío**; output directory: **/** (raíz del proyecto).
4. Despliega en una dirección gratuita `*.pages.dev`. No adquieras dominio ni plan de pago.
5. Verifica los enlaces externos desde el sitio publicado y prueba la versión móvil.

No se ha habilitado el alojamiento automáticamente solo por añadir este repositorio a GitHub.

## Privacidad y uso de datos
No se almacena información personal en servidores VuelosRD. El idioma se recuerda opcionalmente en el dispositivo; los enlaces externos pueden aplicar sus propias políticas de privacidad. No se integran APIs comerciales, raspado web, ni publicidad. No se presenta como sitio oficial.

## Consideraciones antes de ampliar
- OpenSky: revisar derechos de reutilización y obtener licencia adecuada antes de crear aplicaciones de seguimiento operacional.
- Aviationstack: verificar restricciones y derechos del plan gratuito antes de cualquier uso comercial.
- Flightradar24: son enlaces externos; **no** se reproduce contenido, ni se hace scraping, ni se incrusta su mapa.
- Los enlaces y formatos de proveedores pueden cambiar. Se debe validar su funcionamiento regularmente.
- Para tablas de vuelos locales, datos en directo y alertas: primero obtener fuente verificable, permiso de uso y política de costes.

## Prueba manual
1. Abrir `index.html`.
2. Cambiar entre ES, EN, Deutsch, Français y Kreyòl; comprobar navegación y etiquetas.
3. Seleccionar aeropuertos, probar llegadas y salidas (abren nuevas pestañas).
4. Introducir `DE 2228`; el botón de seguimiento enlaza a un proveedor externo.
5. Comprobar que cadenas inválidas no generan una búsqueda.
6. Comprobar la hora dominicana y la interfaz en móvil.

## Costes
El sitio actual tiene **cero servicios de pago obligatorios**. La publicación gratuita depende de mantenerse dentro de los límites de Cloudflare Pages.

## Deployment diagnostics
GitHub-to-Cloudflare Pages integration check: 2026-11-19. The production site should contain five inline SVG language flags. Verify the Cloudflare production commit matches main before declaring the public release current.


## Airline logo attribution and usage

The independent airline-directory cards display four externally hosted SVG marks, **only for identifying the corresponding airline**, from source-documented Wikimedia Commons file pages:

- Condor: https://commons.wikimedia.org/wiki/File:Condor_logo_2022.svg (derived from Condor branding; Condor newsroom permits logo usage with attribution subject to revocation: https://condor-newsroom.condor.com/en/de/downloads/ )
- JetBlue: https://commons.wikimedia.org/wiki/File:JetBlue_Airways_Logo.svg
- Iberia: https://commons.wikimedia.org/wiki/File:Logotipo_de_Iberia.svg
- American Airlines: https://commons.wikimedia.org/wiki/File:AAirlines.png (official-source 2013 logo image; browser-tested; prior SVG source failed to load)

The Wikimedia Commons file pages describe these images as public-domain text/simple-shape marks; **trademark and other rights remain applicable**. All marks remain the property of their respective owners. The site provides a source link on each applicable card and does not claim endorsement or affiliation. The logos are loaded externally from Wikimedia Commons; images may fail or change, in which case a text-code fallback is shown. No icons are generated or inferred from live flight data.

**Air Canada:** Its published policy requires prior permission before using its brand assets or logo: https://www.aircanada.com/ca/en/aco/home/about/media/permission.html . Accordingly, the Air Canada card uses only the textual airline name and code while permission is not documented. Do not replace that fallback with the logo without resolving the permission requirement.

No new paid services, hosted image accounts, trackers, or third-party scripts were added.

## Country flags on the demonstration flight board

The five locally hosted SVGs under `assets/flags/` (Germany `de`, United States `us`, Spain `es`, Canada `ca`, Dominican Republic `do`) are from [lipis/flag-icons](https://github.com/lipis/flag-icons), version retrieved from its public main branch. These files are MIT licensed; the complete license notice is retained in `assets/flags/LICENSE` (copyright Panayiotis Lipiridis). Their use introduces **no new API, tracking, or recurring costs**. City-to-country mappings are manually curated for the **fictional example destinations only**, and do not represent real routes, schedules, or flight operating information.


## Airline directory update (2026-11-19)

The airline directory now contains 28 airline code/name entries, and all 28 shortcuts are shown by default (the toggle can collapse to the first five). 26 entries reference source-documented airline marks hosted on Wikimedia Commons; for Sun Country Airlines and Air Canada, text/code fallbacks remain. Air Canada brand permission is not assumed. Availability, trademark notices and artwork may change; any failed external image automatically falls back to the airline code. Logos identify airlines only and do **not** imply a verified present route, partnership, live flight feed or airline endorsement. Sources for added marks are linked through each airline's `credit` field in `index.html`. No new paid APIs or subscriptions have been introduced.

## Airline quick search and regression coverage (2026-11-19)

The flight-search panel now provides a separate localized airline-code/name filter, a visible match count, an empty state with a reset action, and a clearable search in ES, EN, DE, FR and HT. All 28 airlines are offered by default; the show-less/show-more toggle remains available. Airline logos remain purely decorative in shortcut buttons (`alt=""`), so screen readers use the readable airline code and name. Logo image-load failures remove only the image, never the airline shortcut. Chromium regression tests now cover the expanded directory, search and code matching, zero-results state, collapse/expand control, locale switching and keyboard flight search at three viewport sizes.

The Wikimedia filename for GOL was corrected to `GOL-Logo-Pref-FundoClaro-RGB.svg` after checking the Commons listing. External image reachability and actual GitHub Actions / Cloudflare publishing must be checked separately before claiming a fully validated production deployment.


## Google Search / SEO deployment (2026-11-19)

Search-engine entry points use five real, server-rendered HTML documents:
- Spanish interactive home: https://vuelosrd.pages.dev/
- English overview: https://vuelosrd.pages.dev/en/
- German overview: https://vuelosrd.pages.dev/de/
- French overview: https://vuelosrd.pages.dev/fr/
- Haitian Creole overview: https://vuelosrd.pages.dev/ht/

The overview pages provide independent, translated airport/flight-search explanations and link to the full interactive app using its existing `?lang=` selection. They are deliberately **not** fake flight status pages, nor duplicates of airport listings with invented flight data. Each URL has a self-referencing canonical, descriptive title and description, reciprocal hreflang, and WebPage JSON-LD. The Spanish home has WebSite JSON-LD with the site name. The root `sitemap.xml` lists all five canonical URLs with reciprocal xhtml:link alternates. `robots.txt` continues to allow crawling and points at this sitemap. Search-engine inclusion/rankings are **not guaranteed**.

Verification after deploying: run `node tests/seo-audit.cjs` locally; GitHub's static checks and public smoke workflow validate the published pages and XML. Keep any future custom domain change consistent across canonical, hreflang, sitemap, structured data, robots.txt and Cloudflare before activating it.

**Google Search Console (manual owner authentication required):** open https://search.google.com/search-console/ and select or verify the **URL-prefix property** `https://vuelosrd.pages.dev/` (or use a verified Domain property where applicable). In **Sitemaps**, submit `sitemap.xml`. Inspect the five exact URLs using **URL Inspection**, then request indexing if appropriate. Ownership verification, sitemap submission and actual indexed/not-indexed reporting require the site owner's authenticated Google account, and cannot be claimed from code commits or public GitHub checks. Recheck coverage over subsequent days, not minutes.

## Practical airport guide (November 2026)

The interactive VuelosRD homepage now includes a responsive practical travel section with an airport dropdown synchronized to the existing seven-airport selector. It covers **PUJ, SDQ, STI, POP, LRM, AZS, JBQ**, in Spanish, English, German, French, and Haitian Creole. Its four guidance cards provide official operator information, transport research, customs/baggage and immigration/e-ticket links. They do not display unverified taxi prices, invent connections, make bookings or collect identity details.

Grounded official or authority-controlled links (public pages checked in November 2026):
- PUJ operator: https://www.puntacanainternationalairport.com/en/ — airport transport details: https://www.puntacanainternationalairport.com/en/services/transportations
- STI operator: https://aeropuertocibao.com.do/en/ — arrivals and departures can be checked on the operator's own website; VuelosRD does not copy live flight tables.
- LRM operator: https://www.romanaairport.com/
- SDQ, POP, AZS, JBQ operator network: https://aerodom.com/en/our-airports/ (Aerodom/VINCI)
- Dominican tourism authority transport guide: https://www.godominicanrepublic.com/travel/getting-around
- Dominican Customs official travel and personal baggage guide: https://www.aduanas.gob.do/manual-del-viajero/
- Dominican Immigration free arrival/departure e-ticket: https://eticket.migracion.gob.do/
- Dominican Tourism official entry requirements: https://www.godominicanrepublic.com/travel/entry-requirements

Baggage size/weight is airline and fare-specific. The site does not generalize allowances or guarantee commercial transfer availability and rates, and links the responsible sources instead. The e-ticket is free on the Dominican government's site; users should avoid copycat charging services. All four guidance cards are available in five languages with graceful mobile stacking and keyboard-focus affordances.

Validation: `node tests/travel-assist-audit.cjs` checks seven airport options, five full translations and authoritative sources; `tests/chrome-a11y.cjs` tests actual guide selection and links at three desktop/phone viewport sizes; GitHub's public smoke check verifies the new content on the deployed Cloudflare site. No new recurring charges.

## Seven-airport comparison (2026-11-20)

The VuelosRD landing page includes a `#airport-compare` comparison of **PUJ, SDQ, STI, POP, LRM, AZS, JBQ**, accessible from the main navigation. The search accepts airport code, name and region; filters distinguish operator-specific service details (PUJ, STI, LRM) from airports for which only an operator-wide overview is verified (SDQ, POP, AZS, JBQ). These source-coverage labels are **not statements about actual availability/quality of services**. The interface provides a visible zero-results state, reset button, selected-airport highlighting, synchronized links to the detailed airport view and the external official operator website. Everything is translated to Spanish, English, German, French and Haitian Creole and responsive down to narrow phones.

Official source grounding: Punta Cana operator services and disability assistance: https://www.puntacanainternationalairport.com/en/airport-services and https://www.puntacanainternationalairport.com/en/airport-services/item/wheelchair-service ; Cibao passenger services: https://aeropuertocibao.com.do/en/servicios-a-pasajeros/ ; La Romana services and taxis: https://www.romanaairport.com/service/ and https://www.romanaairport.com/taxi-services/ ; Aerodom operator-wide airport coverage: https://aerodom.com/en/airports/ . No unverified flights, prices, availability, accessibility certifications, airport rankings, route claims or real-time feeds are implied.

Automated verification: `tests/travel-assist-audit.cjs` checks seven supported airports, complete locale messages, and the curated official source group. `tests/chrome-a11y.cjs` and `tests/browser-check.cjs` exercise the accessible search/filter, reset, synchronized detail navigation and mobile layout in Chromium. The Cloudflare smoke workflow checks that the new source/compare UI is present on the published site.

## Traveler checklists and baggage support (2026-11-20)

The public home page has a free, five-language `#passenger-hub` reachable from the top navigation. It includes two independent checklists (five departure steps and five arrival steps), progress indicator, and reset control. Only step numbers / completion state are saved via `localStorage` on the visitor's own device (`vuelosrd_check_v1`). No registration, passport number, booking code, person name, service request, account, external API, cookie tracker or analytics was added. Clearing browser data also clears the ticks. Checklists are generic preparation prompts, not personalized legal advice or guaranteed required documents.

**Lost checked baggage vs terminal lost property:** The help selector distinguishes airline-handled delayed, damaged or missing checked baggage from belongings left in public terminal areas, an important difference confirmed by the Punta Cana airport FAQ and La Romana luggage guide. It never asks visitors to enter personal baggage or itinerary information. For checked bags, passengers are pointed to the airline route and official guidance; the 28-airline selector only links out to existing airline official pages and does not claim to submit a baggage report.

Source documentation:
- Punta Cana airport FAQ (aircraft / checked baggage -> airline; terminal objects -> airport): https://www.puntacanainternationalairport.com/en/faq
- Punta Cana airport Lost & Found: https://www.puntacanainternationalairport.com/en/airport-services/item/lost-found
- Punta Cana official contact: https://www.puntacanainternationalairport.com/en/about-us/contactus
- La Romana airport luggage handling guidance: https://www.romanaairport.com/luggage/
- La Romana terminal Lost & Found: https://www.romanaairport.com/lost-and-found/
- La Romana operator contact: https://www.romanaairport.com/contact/
- Other five airports: only their verified operator websites (Cibao: https://aeropuertocibao.com.do/en/ ; Aerodom: https://aerodom.com/en/airports/) until a specific airport lost-property source is verified. **Do not imply** these are dedicated lost-property desks or direct baggage-claim service.

Test coverage: `node tests/passenger-hub-audit.cjs` checks all seven airports, official source hostnames, five complete translations, item/checked-bag distinctions and privacy. Three viewport Chromium plus system-Chrome public deployment tests cover completion progress, mode isolation, reset, persistence, lost-property source routing, 28-airline official link selector, and localization. No paid service or new recurring cost.

## Integrated multilingual journey assistant (2026-11-20)

The public `#journey-wizard` inside `#passenger-hub` connects three explicit, optional choices: one of seven Dominican airports, one of the 28 airlines already in the verified directory, and arrival/departure stage. All descriptive labels, statuses and warnings are translated to Spanish, English, German, French and Haitian Creole.

The airport selector is synchronized with the existing airport detail and example-board selectors, the airport-specific baggage-contact selector, and the trip transport guide. Airline selection is synchronized with the existing official-airline contact picker; if no airline is selected, the official-airline action is **hidden**, not an invented link. Arrival/departure selection is synchronized with the existing independent local-device travel checklists. The assistant links directly to the current airport operator, official selected airline website, existing checklist, airport transfer guide and baggage support. Buttons and links retain visible keyboard focus and adequate touch target sizes. The layout stacks into one column on small screens.

**Evidence and limitations:** No new airport services, prices, schedules, airline/airport relationships, routes or live flight data were introduced. Operator sites are reused directly from `airportInfo` and airline sites from `airlineDirectory`; this is **not** a claim that any particular airline serves the selected airport, nor that the operator page contains a live flight board. The checked-baggage vs terminal-lost-property guidance continues to reuse existing official contact sources. Journey choices are never sent to a server or retained in localStorage; only the opt-in checklist ticks remain on device. The previously fictional airport flight board is still expressly marked DEMO.

Tests: `tests/passenger-hub-audit.cjs` checks all five journey translations and link provenance. `tests/chrome-a11y.cjs` exercises linked airport/airline/stage choices, absent-airline state and language switching at desktop and narrow viewports. `tests/browser-check.cjs` checks the same on real Chrome and captures the wizard. Cloudflare smoke validates the published controls.
