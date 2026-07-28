# Koong Tung Digital Menu

Static, mobile-first digital menu for Koong Tung seafood boil restaurant.
No online ordering — view only, for QR-on-table use.

**Live site:** https://koongtung.github.io/koongtung-menu/
**Print QR page:** https://koongtung.github.io/koongtung-menu/qr.html
**Admin (edit menu/prices/images):** https://koongtung.github.io/koongtung-menu/admin.html

## Update the menu, prices, or images (recommended: Admin panel)

Open `admin.html` on the live site and log in with a GitHub Access Token
(the panel has step-by-step instructions to create one, scoped to just this
repo, "Contents: read and write" only). From there you can add/edit/delete
menu items, change prices, tags, category, and upload photos — every save
commits straight to this repo and GitHub Pages redeploys in ~1 minute.

The token is stored only in your own browser (`localStorage`) and is sent
directly to GitHub's API — never to any third party. Treat it like a
password; anyone with a valid write-scoped token can edit the menu.

## Update the menu manually (fallback / bulk edits)

1. Edit `assets/data/menu-data.json` (one object per dish, with
   Thai/English/Chinese name, description, price(s), tags, category and image path).
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
