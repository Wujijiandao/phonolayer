# Privacy and Local-First Policy

PhonoLayer is designed as a **local-first desktop application**.

Current public-beta preparation behavior:

- learning documents are local `.phonodoc` files;
- Personal Phonological Memory is stored locally by the desktop runtime;
- no analytics, advertising SDK, account system, or telemetry client is included in the application source;
- normal editing, retrieval, PDF generation, and memory use do not require a network connection;
- the one-time Windows runtime installer may download the Electron runtime when a cached copy is not present;
- external web links, if explicitly opened by the user, are handed to the system browser rather than rendered inside PhonoLayer.

Future official sync, if developed, will be optional. The local desktop core and local file formats are not intended to become dependent on that service.
