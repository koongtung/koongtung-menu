# Koong Tung Digital Menu

Static, mobile-first digital menu for Koong Tung seafood boil restaurant.
No online ordering — view only, for QR-on-table use.

**Live site (customer-facing, use this for the QR code):** https://koongtung-menu.pages.dev/
**Print QR page:** https://koongtung-menu.pages.dev/qr.html
**Admin (edit menu/prices/images):** https://koongtung-menu.pages.dev/admin.html

Also still live (backup mirror, same content): https://koongtung.github.io/koongtung-menu/
Note: the Cloudflare Pages copy above is a manual snapshot — see "Keeping
the two mirrors in sync" below.

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

## Keeping the two mirrors in sync

The admin panel commits changes to GitHub, which auto-redeploys the
`koongtung.github.io` copy in ~1 minute. The `koongtung-menu.pages.dev`
copy does **not** auto-update — it was a one-time upload made with
`wrangler pages deploy .`. To push the latest changes to Cloudflare Pages
too, run from this folder:

```
wrangler pages deploy . --project-name=koongtung-menu --branch=main
```

(Ask to set up automatic sync via GitHub Actions if you'd rather not run
this by hand after every edit.)

## Local preview

```
python3 -m http.server 8000
```
then open http://localhost:8000
