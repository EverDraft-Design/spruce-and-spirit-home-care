# Spruce & Spirit Home Care

A polished one-page static website for Spruce & Spirit Home Care, a warm and practical home care business offering thoughtful cleaning, organising, and home support.

The site is intentionally simple to host and maintain. It uses plain HTML, CSS, and a small JavaScript file for the mobile menu.

## Folder Structure

```text
spruce-and-spirit-home-care/
+-- index.html
+-- styles.css
+-- script.js
+-- README.md
+-- assets/
    +-- logo/
    |   +-- logo-primary.png
    |   +-- logo-horizontal.png
    |   +-- brand-icon.png
    |   +-- social-profile.png
    +-- favicon/
    |   +-- favicon.ico
    |   +-- favicon-16x16.png
    |   +-- favicon-32x32.png
    |   +-- apple-touch-icon.png
    |   +-- android-chrome-192x192.png
    |   +-- android-chrome-512x512.png
    +-- gallery/
    |   +-- placeholder-pantry.png
    |   +-- placeholder-laundry.png
    |   +-- placeholder-home-reset.png
    +-- decorative/
        +-- spruce-divider.png
        +-- sparkle-icon.png
```

## Colour Palette

The palette is defined as CSS variables in `styles.css`:

```css
:root {
  --sage: #9CAF88;
  --sage-light: #DDE6D5;
  --charcoal: #2F3430;
  --warm-white: #FAF8F2;
  --taupe: #B8A99A;
  --white: #FFFFFF;
}
```

## Asset Naming Notes

- `assets/logo/logo-horizontal.png` is used in the header.
- `assets/logo/logo-primary.png` is used in the hero.
- `assets/logo/brand-icon.png` is used as a small brand mark.
- Favicon files are linked in the HTML head.
- Gallery placeholder images can be replaced without changing the page structure if the filenames stay the same.

## Replacing Placeholder Gallery Images

Replace the files in `assets/gallery/` with real client-approved before and after images:

- `placeholder-pantry.png`
- `placeholder-laundry.png`
- `placeholder-home-reset.png`

For best results, use landscape images with a 4:3 ratio. Keep captions respectful and avoid shame-based language.

## Contact Form

The contact form is static for now. It uses `action="#"` and `method="post"` so it can be connected later to email handling, a form service, or a hosting provider form feature.
