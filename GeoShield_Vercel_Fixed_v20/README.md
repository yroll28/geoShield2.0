# GeoShield Mapping Services — v10

This version adds animated numeric counters across the public service/quick-stat numbers and the private admin dashboard statistics.

## Animated numbers
- Public quick overview numbers (01–04) count up smoothly when they enter the viewport.
- Public service numbers (01–06, or custom service numbers) count up smoothly when visible.
- Admin Dashboard counters (Total Requests, New, In Progress, Completed) count smoothly to their live values whenever the dashboard refreshes.
- Admin counters include a subtle completion pop animation.
- The counters respect the existing page structure and do not animate phone numbers, dates, IDs, or ordinary text that happens to contain digits.

Previous features are retained, including the private admin portal, slideshow transitions, news pagination, location hierarchy, mobile responsive fixes, and completion-email workflow.


## v14 fixes — media, branding, and editable GIS
- Fixed homepage/logo/project image uploads by validating images, resizing/compressing them before browser storage, clearing file inputs after upload, and showing useful storage errors.
- Company logo remains editable from **Homepage Media → Site Logo**.
- Company/business name is editable from **Website Settings → Business Name**.
- Added **GIS Map Editor** in the private admin portal.
- GIS editor supports editable title, center, zoom, add-on-click markers, draggable markers, marker name/category/color/coordinates, locate, remove, reset, and save.
- Public **MAP PORTAL** now renders the saved interactive Leaflet GIS map and its marker legend.
- Added responsive GIS editor styling for mobile.
- Added explicit media-storage status and safer HTML handling for uploaded image previews.
