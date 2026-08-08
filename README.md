# linkpage

Build a business link page in your browser. Export **one self-contained HTML file**. Put it anywhere.

> **Status: design phase.** No usable software exists yet. This repo holds the design work
> for v1 plus a scaffold that builds and tests — the renderer emits a placeholder page and
> the builder is an empty shell. See the [wayfinder map](../../issues/1) for what has been
> decided and what is still open.

## What this will be

A free, MIT-licensed visual builder for the kind of one-page link site a small business
needs — the page you put in an Instagram bio, on a printed flyer, or behind a QR code on
the counter.

It is aimed at business owners with very little technical knowledge:

- **Nothing to install.** It runs in your browser.
- **No account, no signup, no subscription.** Your page is never on our servers, because
  there are no servers.
- **One file out.** Export produces a single `index.html` with the styling and the images
  inside it. Drag it onto a free host, or email it to whoever runs your website.
- **No JavaScript in your page.** What you get is plain HTML and CSS, so it loads instantly,
  works with the network off, and has nothing in it that can break later.
- **Built for businesses,** not just creators: hours, address, phone, and social links
  alongside your link buttons.

## What this will not be

Deliberately out of scope, so the tool stays simple and stays free:

- Click analytics or visitor tracking
- Contact or lead-capture forms
- Custom domain setup
- Multi-page websites

## How it is put together

```
packages/renderer   render(project) → the complete text of your index.html.
                    Plain TypeScript, zero dependencies. This is the artifact contract.
packages/builder    React + Vite editing app, deployed to GitHub Pages.
                    Previews by putting the renderer's output in an iframe, so the
                    preview is the export rather than an imitation of it.
```

## Contributing

Contributions are welcome, and the constraints above are firm — a few obvious features are
ruled out on purpose. [CONTRIBUTING.md](./CONTRIBUTING.md) covers what gets rejected and
why, the three invariants CI enforces, and how to get running:

```bash
corepack enable
pnpm install
pnpm dev
```

Node 22+ (`.nvmrc` pins 24). By participating you agree to the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE)
