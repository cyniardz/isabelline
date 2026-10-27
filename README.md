# ISABELLINE

A quiet candle brand website that turns into a Halloween night store.

Portfolio project. ISABELLINE is a fictional brand and this is not a real store. No payment is processed.

## Run locally

The pages load `data/*.json` with `fetch`, so open the folder with a local server, not by double-clicking the file.

- VS Code: install the Live Server extension, right-click `index.html`, choose "Open with Live Server".
- Or in a terminal: `python3 -m http.server 8000` and open http://localhost:8000

## Flow

1. `index.html`: ISABELLINE in daylight. Curtain and wall shadow move slowly, the room follows the mouse.
2. Enter the night: the page goes dark and the logo turns ivory.
3. `night/index.html`: click the door, the intro plays, click the candle to take the flame.
4. Light the five candles in the hero, then the six limited candles. Lit candles stay lit.
5. Scroll three times to move on. The flame goes out, smoke rises, the scent section opens.
6. `product.html`, `cart.html`, `checkout.html`, `complete.html`: a working mock shop.

State rules

- Lit candles stay lit on refresh, back and after visiting a product.
- When you come back, the flame waits in the middle. Click it to pick it up again.
- Going back to daylight or closing the tab resets the night.

## Structure

```
index.html            ISABELLINE main
night/                Halloween main, product, cart, checkout, complete
css/tokens.css        design tokens (:root)
css/base.css          nav, buttons, captions, footer
css/basic.css         daylight main
css/night.css         night main and the flame
css/shop.css          product, cart, checkout, complete
js/common.js          KR/EN, cart, night state, nav and footer
js/basic.js           daylight motion and the night transition
js/night.js           flame, darkness, lighting, scroll scenes
js/shop.js            product, cart, checkout, complete
data/products.json    11 Halloween products
data/copy.json        KR/EN copy and option sets
assets/               images, video, favicons, Figma layout images
```

## Tools

Figma, ChatGPT, Gemini, Flow, VS Code, Vercel

## Status

- [x] Planning
- [x] Images and video
- [x] Wireframe
- [x] Layout
- [x] Development v1
- [ ] Design review and fixes
- [ ] Deploy
