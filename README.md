# Gullu

**Live:** https://aari-7.github.io/gullu/

A pretend-money app for kids aged 8 to 18, built for the Dezerv Children's Day Hackathon 2026.

Gullu is a clay gullak (the Indian money pot) that comes alive in 3D. Coins fly into it when you get money and pop out when you spend. It answers the three challenge questions:

| Challenge question | What Gullu does |
| --- | --- |
| "Where did all my money go?" | **Where it went** shows coin stacks for each kind of spending, drawn to scale (1 coin = a fixed amount). The money lens turns any amount into samosas, ice creams or days of saving: ₹500 = 25 samosas. |
| "How do I save for that cycle?" | **Save up** builds a 3D cycle one part at a time as the goal fills ("Next part: handlebars in ₹580"). Other goals fill a labelled coin jar. "This ice cream pushes your cycle back 3 days" is shown before every spend. |
| "Can I buy this, Mum?" | **Can I buy?** lets a kid ask with a price and a reason (need or want). A grown-up answers on the same phone after a quick sum check, or on their own phone through a WhatsApp link. Answers are stamped: Yes, Half-half, Not now, Let's talk. A "Not now" can turn into a savings goal. |

Out-of-the-box ideas: Gullu has moods, "save first" moves a share of every money-in into the main goal automatically, and "Sleep on it" makes a kid wait a day before asking.

## Rules check

- Made-up amounts only. No bank, UPI, card or wallet.
- Opens from a link. No sign-in, no download.
- No real personal info: kids pick a made-up nickname, and nothing leaves the browser (it is saved in localStorage).
- No ads, no payments.

## Run it

```bash
npm install
npm run dev
```

## Build and put it online

```bash
npm run build
```

To publish a new version to GitHub Pages (needs the GitHub CLI, logged in):

```bash
npm run deploy
```

This builds the app and pushes the `dist` folder to the `gh-pages` branch. Keep the link working until 14 November.

## 2-minute demo video

1. (0:00) Home: Gullu in 3D, the balance, and the lens switched to samosas.
2. (0:20) "I got money", ₹100 from chores. Coins drop in, and 20% is saved first.
3. (0:40) "I spent money", ice cream ₹50: "pushes your cycle back 3 days".
4. (1:00) Where it went: the coin stacks, then the line that turns your spending into samosas.
5. (1:20) Save up: the cycle building itself, and the weekly slider.
6. (1:35) Can I buy?: ask for a football, hand the phone over, stamp "Half-half".

## Tech

React 18, Framer Motion (every UI animation), React Three Fiber + drei (all 3D is built in code, no model files), Vite.
