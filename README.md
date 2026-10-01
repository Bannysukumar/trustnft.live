<!-- readme-seo: bannysukumar-professional-v4 -->

# TrustNFT

TrustNFT is an HTML and JavaScript investment platform. The login page heading is TrustNFT, and the page subtitle is "TrustNFT Investment Platform". Account data is loaded with Firebase.

## Overview

`index.html` is a phone-number and password login form. After login, `dashboard.html` shows a balance and promotional banners. Other pages in the repository cover products, mining, recharge, withdrawal, invites, team, coupons, profit, bank account, wallet binding, FAQ, registration, and an admin dashboard.

`package.json` depends on Firebase only. This repository does not contain a Solidity contract, so it is not documented here as an Ethereum NFT marketplace.

The repository homepage is https://trustnft-live.vercel.app.

## Features

Confirmed by HTML files in the repository root:

- Login, registration, and forgot-password pages
- Dashboard with a balance display
- Products and buy-product pages
- Mine, recharge, withdraw, and profit pages
- Invite, my-team, and my-friends pages
- Coupon, FAQ, settings, and admin dashboard pages
- Firebase client setup in `firebase-config.js`

## Tech Stack

| Technology | Where it shows up |
|---|---|
| HTML | Page files such as `index.html` and `dashboard.html` |
| JavaScript | Page scripts such as `index.js` and `dashboard.js` |
| Firebase | `package.json` and `firebase-config.js` |

## Architecture

Static HTML pages → JavaScript → Firebase, using `firebase-config.js`.

## Project Structure

```text
trustnft.live/
├── index.html
├── dashboard.html
├── products.html
├── mine.html
├── recharge.html
├── withdraw.html
├── admin/
├── firebase-config.js
├── firestore.rules
└── package.json
```

## Prerequisites

- A browser
- Node.js and npm if you install the Firebase package from `package.json`

## Installation

```bash
git clone https://github.com/Bannysukumar/trustnft.live.git
cd trustnft.live
npm install
```

Open `index.html` in a browser. Firebase settings are read from `firebase-config.js`.

## Configuration

Put Firebase project settings in `firebase-config.js`. Do not commit a production service-account key. `firestore.rules` is included in the repository.

## Usage

Sign in from `index.html` with the phone and password form. The dashboard and the recharge, withdraw, product, and team pages are separate HTML files linked from the app.

## Demo

https://trustnft-live.vercel.app

## Deployment

The GitHub homepage for this repository is https://trustnft-live.vercel.app.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Licensed under MIT. See [LICENSE](LICENSE).

## Author

Banny Sukumar

GitHub: https://github.com/Bannysukumar
