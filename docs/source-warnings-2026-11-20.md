# Official source warnings — independent cross-check (2026-11-20)

This is a **diagnostic evidence log**, not a list of broken links or a claim that any source returns a successful HTTP response from every network. VuelosRD does not scrape third-party content or manufacture flight data.

## What the automated runner actually means

- **HTTP 401**: request rejected as unauthorized; do not automatically call it bot protection, and do not delete the URL.
- **HTTP 403**: automated request forbidden, plausibly WAF/bot protection, geographic policy or authorization. It does **not** establish browser unavailability.
- **Opaque `23`**: runner transport/error code captured by the monitoring process, **not HTTP 23**, not proof of DNS or TLS failure. Its cause remains unverified without lower-level network traces.
- **HTTP 503**: a responding web server or intermediary is temporarily unavailable. The source checker retries once; this does not prove a URL is permanently bad.
- **HTTP 404/410**: only considered potentially broken when a repeat GET also yields the missing response; no such confirmed responses in the latest checked runs.
- DNS, TLS and timeouts have separate failure categories with local deterministic unit tests. An independent search engine serving a copy of a page is **supporting context**, not direct verification of its availability to every visitor.

## Thirteen recurring uncertain source links

| Operator / authority | Monitored URL | Automated observation | Independent evidence / status | Action |
|---|---|---|---|---|
| Dominican immigration | https://eticket.migracion.gob.do/ | 403 | No direct external success established in this audit | Keep; manual human browser check needed |
| American Airlines | https://www.aa.com/homePage.do?locale=en_US | 403 | Exact URL indexed with recognizable official airline site: https://www.aa.com/homePage.do?locale=en_US | Keep; likely crawler-specific access denial |
| Air Europa | https://www.aireuropa.com/ | 403 | No successful cross-check of this exact page in this audit | Keep; manual human browser check needed |
| Air France | https://www.airfrance.com/ | opaque 23 | Independent direct fetch also returned **HTTP 403**, while first-party corporate site remains published: https://corporate.airfrance.com/en/news | Keep; access restrictions, not a proven dead official site |
| Avianca | https://www.avianca.com/ | 403 | No successful cross-check of exact page in this audit | Keep; manual human browser check needed |
| Copa Airlines | https://www.copaair.com/ | 401 | First-party regional pages independently indexed: https://www.copaair.com/en-us/ and https://www.copaair.com/en-ca/ | Keep existing link; automated homepage response remains uncertain |
| Discover Airlines | https://www.discover-airlines.com/ | 403 | Official regional home https://www.discover-airlines.com/de/de/homepage indexed recently | Keep; do not confuse homepage variants with broken site |
| Iberia | https://www.iberia.com/do/flight-status/ | 403 | First-party Dominican flight status variant: https://www.iberia.com/do/seguimiento-vuelos/ independently indexed; original URL not proven broken | Keep; retain alternative as investigative option |
| LATAM | https://www.latamairlines.com/ | 403 | No successful exact-URL cross-check established here | Keep; manual human browser check needed |
| Spirit (historical, ceased operations) | https://www.spiritrestructuring.com/ | opaque 23 | Official restructuring guest resource https://www.spiritrestructuring.com/guests indexed; direct homepage lookup timed out; first-party shutdown notice https://spiritrestructuring.com/resources/Spirit-Airlines-Begins-Orderly-Wind-Down-of-Operations.pdf | Keep as **historical**, never advertise new Spirit flights |
| United Airlines | https://www.united.com/en/us/flightstatus | opaque 23 | The **exact** URL was retrieved independently as an HTML/JavaScript application shell (no live status data retrieved). https://www.united.com/en/us/flightstatus | Keep; runner-specific network failure not confirmed site failure |
| GOL | https://www.voegol.com.br/ | 403 | Official flight-related page indexed: https://www.voegol.com.br/voos-gol | Keep; homepage still requires human confirmation |
| World2Fly | https://www.w2fly.es/ | 403 | Official regional site indexed recently: https://www.w2fly.es/en-en/ | Keep; homepage response uncertain in automated runner |

## La Romana 503 case

A prior source-health run temporarily returned HTTP 503 for five La Romana pages. Independent direct fetch of the official homepage **succeeded** on 2026-11-20: https://www.romanaairport.com/ . Its operator's lost-property and baggage pages were also independently indexed: https://www.romanaairport.com/lost-and-found/ and https://www.romanaairport.com/luggage/ . The later runner recovered with no repeated 503, so do not delete or redirect those pages based solely on the earlier outage.

## Extra recovery confirmation

The exact Condor flight-status URL that once produced an opaque transport warning independently returned its actual first-party flight-status page: https://www.condor.com/en-gb/information-services/travel-information/flight-status/ . The page itself cautions that official flight information is time-sensitive.

## Next useful diagnostic work

If a link repeatedly fails for **human users**, capture the actual URL, local date/time, user-visible browser HTTP result (or screenshot), network and redirect chain and geographic context. When verifying independently, compare **exact URLs**; regional homepages, search snippets and archival versions are useful but not conclusive. Do not weaken TLS validation, fake user agents, bypass WAFs, or switch an existing official URL merely to drive the uncertain counter to zero.
