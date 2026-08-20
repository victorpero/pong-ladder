# Application icons

Every icon the product ships — browser tab, iOS home screen, Android launcher,
install prompts — is generated from a single brand asset so the installed app
always matches what people see inside the app.

## Source of truth

`public/images/logo.png` is the canonical mark. It is the same file the in-app
header and login screen render through `src/components/LogoMark.tsx`. Nothing
else is hand-drawn or exported separately.

Regenerate the full set after changing that file:

```bash
npm run icons:generate
```

The generator (`scripts/generate-app-icons.ts`) trims the transparent margin from
the source, frames the artwork for each platform, and writes:

| File | Size | Used for |
| --- | --- | --- |
| `src/app/favicon.ico` | 16, 32, 48 | Browser tab and bookmarks |
| `src/app/apple-icon.png` | 180 | iOS **Add to Home Screen** |
| `public/icons/icon-192.png` | 192 | Manifest icon, `purpose: any` |
| `public/icons/icon-512.png` | 512 | Manifest icon, `purpose: any`, install preview |
| `public/icons/icon-maskable-192.png` | 192 | Manifest icon, `purpose: maskable` |
| `public/icons/icon-maskable-512.png` | 512 | Manifest icon, `purpose: maskable` |

`src/app/manifest.ts` references the `public/icons` files. The favicon and Apple
icon are picked up automatically by the Next.js App Router file conventions.

`tests/app-icons.test.ts` re-renders the set and compares it against the
committed files, so a logo change that is not regenerated fails CI.

## Design decisions

**Solid white plate.** The in-app logo always sits on white surfaces, so the
icons do so too rather than shipping transparency. It keeps the black paddle
visible against dark launchers and dark browser chrome, and maskable icons have
to be opaque edge to edge regardless. The generator drops the alpha channel when
an icon is fully opaque, which keeps the 512px files well under 100 kB.

**Framing.** Plain icons fit the artwork inside a centred box at 82% of the icon
width. Maskable icons are sized so the smallest circle enclosing the *drawn
pixels* fills 80% of the icon, which is the safe zone launchers may crop to.
Measuring real pixels rather than the artwork's bounding box matters here: the
mark is wider than it is tall and its bounding-box corners are empty, so
padding for those corners would shrink the logo for no reason.

**No text.** The mark is the crossed paddles only. "Pong Ladder" is never baked
into an icon, since it is illegible at 48px and below.

## Manual validation

Browsers and operating systems cache manifest icons aggressively. **Always clear
the previous install first**, or you will be looking at a stale icon and mistake
it for a broken implementation.

### Chromium (Android, and desktop Chrome/Edge)

1. Uninstall any existing Pong Ladder app: `chrome://apps` → right-click →
   **Remove**, or long-press the Android home-screen icon → **Uninstall**.
2. Open DevTools → **Application** → **Storage** → **Clear site data**.
3. Hard reload the page.
4. DevTools → **Application** → **Manifest**. Confirm all four icons resolve with
   no warnings, and use the **Maskable** preview toggle to check the safe area.
5. Install the app from the omnibox install button. Confirm the install preview
   dialog, the launcher icon, and the app-switcher entry all show the paddles.

On Android, verify against a launcher that applies a circular mask and one that
applies a rounded-square mask, since they crop maskable icons differently.

### iOS / iPadOS Safari

1. Delete any previously added home-screen icon.
2. Settings → Safari → **Clear History and Website Data** (or use a private tab
   for a first look, then a normal tab to install).
3. Open the site in Safari, then **Share** → **Add to Home Screen**.
4. Confirm the preview in that sheet and the resulting home-screen icon show the
   paddles on a white rounded square, with nothing clipped by the corner radius.
5. Launch it and confirm the standalone app and app switcher show the same icon.

### Browser tab

Hard reload and confirm the tab shows the paddles. Favicons are cached
especially aggressively; if the tab looks stale, load `/favicon.ico` directly to
confirm the served file is correct.
