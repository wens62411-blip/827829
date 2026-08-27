# Cloud function source and runtime layout

The five modular-monolith boundaries live in this directory. TypeScript is the single implementation source. Generated JavaScript files carry a `CLOUD_RUNTIME_SOURCE_SHA256` banner and must not be edited manually.

```powershell
npm run build:cloud-runtime
npm run check:cloud-runtime
```

The build bundles each API entry with its frozen shared guards/contracts into that API's own `index.js`, so an individual function package does not require a sibling `../_shared` directory at runtime. Shared helper bundles are also generated because local security tests execute them directly. Each API `package.json` points to its self-contained `index.js`.

This build is local packaging evidence only. It does not create or select a CloudBase environment, upload a function, apply security rules or prove cloud execution.

