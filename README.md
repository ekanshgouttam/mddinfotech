# MDD Infotech website

The one-page website for MDD Infotech, a digital marketing and web development agency in Jaipur.
It lives at https://mddinfotech.net and is hosted on Vercel.

It is plain HTML, CSS and JavaScript modules: no framework, no build step, no dependencies.
What is in this repository is exactly what Vercel serves.

## Run it locally

The scripts are ES modules, so the page has to come from a local server, not a `file://` path.
From the repository folder:

```bash
python -m http.server 4321
```

Then open http://localhost:4321. There is nothing to install and nothing to build: edit a file
and reload.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All the content, the page head (title, description, social cards) and the structured data (JSON-LD) |
| `css/style.css` | All styles. Colours, the font and spacing are tokens in `:root` at the top |
| `js/main.js` | Runs the page: scroll scenes, the loader, navigation, the print-in effect and the frame loop (`tick`) |
| `js/engine.js` | The full-screen canvas behind the dark sections: the ruled grid, the hero circuit, the project models and the contact disc |
| `js/lab.js` | The services section: six live diagrams on light paper and the tile break-up that ends it |
| `assets/` | Logos, favicons and `og-image.jpg`, the 1200 × 630 image shown when the link is shared |
| `robots.txt`, `sitemap.xml`, `llms.txt` | For search engines and AI assistants |

## How the page works

**Two canvases.** `#engine` is fixed behind the whole page and draws everything in the dark
sections. The services section draws on its own `.lab-canvas`. The text is ordinary HTML on top.

**Scroll scenes.** The hero, services, work and process sections are `.scene` elements whose
`.stage` sticks to the screen while you scroll through them. `progress(section)` in `main.js` turns
the scroll position into a number from 0 to 1 that drives each scene. A scene's length is its
height in `style.css` (`.js .hero { height: 280vh; }` and so on): a taller section plays slower.

**Anchors.** Empty elements (`.diagram-anchor`, `.model-anchor`, `.panel-anchor`) mark where the
canvases draw. To move or resize a drawing, change that element's CSS, not the JavaScript.

**Opening.** The loader fills its dial, then its disc flies to the hero and becomes the chip's
centre. `power()` in `main.js` then starts the circuit growing and adds `is-ready` to `<body>`.

**Hero circuit.** `Circuit` in `engine.js` grows traces from the chip and keeps clear of the
headline, the copy and the header. It measures them on load, so changing the hero text needs no
JavaScript change.

**Generated as you scroll.** `Engine.grid` rules the grid lines in as you go down the page.
Blocks listed in the `prints` selector in `main.js` print in with an orange print head the first
time they appear. Add or remove selectors there to change which blocks do this.

**Navigation.** The control at the top right opens a site map. When adding or renaming a section,
update its link in the `#sitemap` list in `index.html` and its name in `NAMES` in `main.js`.

## Rules that keep it working

- **The page must work without JavaScript.** An inline script in the head swaps the `no-js` class
  on `<html>` for `js`. Everything that hides content or animates it is scoped under `.js`, so with
  scripts off the page is still complete and readable. Keep new styles that way.
- **Reduced motion.** With "reduce motion" turned on in the operating system, `reduce` in `main.js`
  is true: no loader, the circuit appears fully grown, nothing prints in, nothing moves. Test any
  new motion with this setting on.
- **One `<h1>`.** It is `.hero-h1`. Use `<h2>` and `<h3>` everywhere else.
- **FAQ text appears twice.** Each answer is in the visible FAQ section and in the `FAQPage` data
  in the page head. Google requires them to match, so change both together.
- **Business details must be identical everywhere.** Name, address, phone and email appear in the
  structured data, the contact section, the site map and `llms.txt`. Search engines and AI
  assistants cross-check them.
- After changing content, update the `<lastmod>` date in `sitemap.xml`.

## Content still to replace

- The four projects under "Selected work" (Saffron & Salt, Kavya Rao, Northfold, Ledgerly) and
  their results are samples. Replace them with real clients before the site is promoted.
- "We reply within one working day" in the contact section is still to be confirmed.

## Making changes and deploying

`main` is the live site. Work happens on the `dev` branch.

1. Switch to `dev` and bring it up to date with the live site: `git switch dev`, then
   `git pull origin main`.
2. Make the change, check it locally, commit, and `git push`.
3. When it is ready to go live, open a pull request on GitHub from `dev` into `main`.
4. The repository owner reviews it and merges it with **Create a merge commit**.
   Vercel deploys `main` to mddinfotech.net automatically.

The Vercel project is on the Hobby plan. On that plan Vercel deploys only commits made by the
account owner, so pushes from other contributors don't go live on their own. A merge commit made
by the owner counts as the owner's commit; a squash merge keeps the contributor as its author and
may be blocked.

Before opening a pull request, check:

- The browser console shows no errors.
- The page looks right on a desktop screen and on a phone, including the hero at both sizes.
- It works in Chrome, Safari and Firefox.
- It works with "reduce motion" on.
