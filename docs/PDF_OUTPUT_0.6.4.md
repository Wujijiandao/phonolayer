# PDF output — v0.6.4

The PDF subsystem has three layers: document display policy, print CSS, and Electron printToPDF.

## Presets
Current / Study / Review / Text phonetic / Pitch only. Presets fill explicit output settings; they never infer learning data.

## Preview
Preview uses the same printToPDF pipeline as export, writes a temporary PDF under the OS temp directory, then opens it with the system PDF viewer.

## Header/footer
Chromium header/footer templates provide document title/custom header and page or page/total footer.

## Pagination
CSS orphans/widows are enabled for paragraphs and list items. Headings, images, ruby annotations and pitch plots receive break-avoid rules where Chromium supports them.
