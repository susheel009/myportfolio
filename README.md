# myportfolio

Portfolio for Susheel Mondithoka, engineering manager working on distributed systems and applied AI.
Live at <https://susheel009.github.io/myportfolio/>.

It is a static site with no build step. GitHub Pages serves the repository root.

## Layout

| Path | Purpose |
| --- | --- |
| `index.html` | The page. All copy lives here. |
| `assets/css/site.css` | Palette, layout, and motion states. |
| `assets/js/site.js` | Interactions. Each motion either orients, sequences, or demonstrates. |
| `assets/vendor/` | Vendored GSAP 3.15.1 (ScrollTrigger, SplitText) and Lenis 1.3.28. |
| `assets/files/Susheel-Mondithoka-Resume.pdf` | Public résumé, generated from `src/resume.html`. |
| `assets/img/og-card.png` | Link preview for LinkedIn, generated from `src/og-card.html`. |
| `assets/img/github-qr.svg` | QR code for `github.com/susheel009?tab=repositories`. |
| `tools/` | Asset generation and visual QA (headless Edge or Chrome). |

## Editing

- The page copy is in `index.html`, and the résumé copy is in `src/resume.html`. Keep the two consistent.
- Public content leaves out client names, internal system names, and unverified figures.
- To regenerate the PDF, social card, and QR code: `cd tools && npm install && npm run assets`.
- To check layout at 1440, 1366, 834, and 390 px and in reduced motion: `npm run qa` (screenshots go to `tools/.qa-shots/`).
  Set `CHROME_PATH` if Edge is not at its default Windows path.
- To check real phone engines (Android Blink and iPhone WebKit, with touch): run `npx playwright-core install webkit` once, then `npm run qa:mobile`.
  Set `BASE=https://susheel009.github.io/myportfolio/` to check the live site. It flags text that is on screen but invisible, anything wider than the screen, and console errors.

## Motion and accessibility

- With `prefers-reduced-motion`, there is no smooth scrolling, pinning, or looping, and the page is a still composition.
- Without JavaScript, all content is in the HTML and visible.
- Loops run only while on screen.

## Licences

GSAP is used under the GreenSock Standard "No Charge" License. Lenis is MIT. Fonts are Newsreader and IBM Plex (SIL OFL) via Google Fonts.
