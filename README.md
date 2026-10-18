# RAG-WebApp

**Live:** https://rag.diegodebrun.com

**API code here:** https://github.com/Diegodebece/RAG-WebApi

This frontend was built entirely by [Claude Code](https://claude.com/claude-code), with a single purpose: to make the RAG project usable from a browser. The project itself is the API, **RAG-WebApi**, which splits documents into passages, indexes them and answers questions citing its sources. This repository is only its interface.

## What it does

- **Upload a document** (PDF, Word or plain text). The browser extracts the text and sends only that; the file never leaves the computer. It checks the 200,000-character limit and warns when a PDF looks scanned.
- **Follow the indexing live**: place in the queue, then a progress bar, through the API's event stream (with polling as a fallback).
- **Ask questions** about a ready document. Answers cite the passages they rely on: each `[F1]` opens its source.
- **My documents**: the user's documents, their status and when they expire (after 24 hours), with delete.
- **Accounts**: log in and sign up in a modal; the session lasts one hour and the dialog comes back when it expires.
- **Server status** next to the logo, since the API runs on a home PC that may be off.
- English and Spanish, light and dark theme, and an animated constellation background.

## Stack

- **React 19 + TypeScript** (strict), built with **Vite**, linted with **oxlint**
- **pdf.js** and **mammoth** for reading PDF and Word files in the browser, loaded only when needed
- **Inter** as a self-hosted font
- Deployed as static files on **Cloudflare Pages**

## Running it locally

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173 and forwards `/v1` to the API (see `vite.config.ts`), so the API's CORS settings only need the production address. `npm run build` writes the static site to `dist/`.
