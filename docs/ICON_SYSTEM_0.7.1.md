# Icon System 0.7.1

The v0.7.1 icon family is based on PhonoLayer's actual document model rather than a lettermark:

- lower layer: two abstract text cells;
- upper layer: small phonetic marks and a pitch contour;
- app icon: compact rounded-square brand mark;
- `.phonodoc` icon: Windows document page carrying the same PhonoLayer mark.

The ICO files contain dedicated 16/20/24/32/40/48/64/128/256 px images so Windows Explorer does not have to downscale a single 256 px bitmap.

Vector sources are retained as `assets/phonolayer-mark.svg` and `assets/phonodoc-icon.svg`; Windows uses the generated multi-size ICO files.
