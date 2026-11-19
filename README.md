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
