# Koong Tung Digital Menu

Static, mobile-first digital menu for Koong Tung seafood boil restaurant.
No online ordering — view only, for QR-on-table use.

**Live site:** https://koongtung.github.io/koongtung-menu/
**Print QR page:** https://koongtung.github.io/koongtung-menu/qr.html

## Update the menu or prices

1. Edit `assets/js/menu-data.js` (plain JS array — one item per dish, with
   Thai/English/Chinese name, description, price(s), tags, category and image).
2. Save, then `git add -A && git commit -m "update menu" && git push`.
   GitHub Pages redeploys automatically in ~1 minute. No build step required.

## Change logo / brand colors

- Logo file: `assets/img/brand/logo.jpg` — replace with your own image (same filename).
- Colors: edit the `:root` variables at the top of `assets/css/style.css`
  (`--primary`, `--secondary`, `--cream`).

## QR code for tables

Open `qr.html` on the live site, paste the deployed URL if not auto-filled,
click "print". It's designed to print nicely as a table tent card.

## Local preview

```
python3 -m http.server 8000
```
then open http://localhost:8000
