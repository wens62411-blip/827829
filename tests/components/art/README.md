# Art component verification

The repository root test command discovers `*.test.mjs` quality gates only. The
real custom-component runner is deliberately named `simulate-runner.mjs`, so a
fresh root `npm ci && npm run build` never depends on nested dependencies that
it did not install.

Run the component simulator independently:

```powershell
cd tests/components/art
npm ci
npm test
```

`miniprogram-simulate` runs the actual four component definitions after their
TypeScript entrypoints are compiled into a temporary test tree. It verifies
rendered branches, data updates and emitted events. jsdom does not provide a
real WeChat layout engine, so these tests are not Developer Tools, device or
pixel-layout evidence.

Generate the explicitly limited visual references with installed Chrome or
Edge:

```powershell
npm run screenshots
```

The resulting PNGs are `LOCAL_STATIC_RENDER` references. They are not rendered
by WeChat Developer Tools and must not upgrade preview or device gates.
