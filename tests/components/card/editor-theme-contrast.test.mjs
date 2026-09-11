import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');
const editor = read('miniprogram/packageCard/pages/edit/index.wxss');
const profile = read('miniprogram/components/ab-profile-card/index.wxss');
const verified = read('miniprogram/components/ab-verified-tag/index.wxss');

function declarations(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing CSS rule ${selector}`);
  return Object.fromEntries([...match[1].matchAll(/([\w-]+)\s*:\s*([^;]+);/g)]
    .map((entry) => [entry[1], entry[2].trim()]));
}

function luminance(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i);
  const rgb = hex.slice(1).match(/../g).map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('editor ivory feedback, fields, placeholders and selected tags stay legible when global dark styles apply', () => {
  const palette = declarations(editor, '.card-editor-page');
  const feedback = declarations(editor, '.card-editor-page .card-status--error');
  const input = declarations(editor, '.card-editor-page .card-picker');
  const placeholder = declarations(editor, '.card-editor-page .textarea-placeholder');
  const selected = declarations(editor, '.card-editor-page .card-interest-chip--selected');
  assert.equal(feedback.background, 'var(--editor-surface)');
  assert.equal(feedback.color, 'var(--editor-ink)');
  assert.match(editor, /\.card-editor-page \.card-status,\s*\.card-editor-page \.card-status--success,\s*\.card-editor-page \.card-status--error\s*\{/);
  assert.equal(input.background, 'var(--editor-surface)');
  assert.equal(input.color, 'var(--editor-ink)');
  assert.equal(input['border-color'], 'var(--editor-line)');
  assert.equal(placeholder.color, 'var(--editor-muted)');
  assert.equal(placeholder.opacity, '1');
  assert.equal(selected.color, 'var(--editor-gold-ink)');
  assert.ok(contrast(palette['--editor-ink'], palette['--editor-surface']) >= 4.5);
  assert.ok(contrast(palette['--editor-muted'], palette['--editor-surface']) >= 4.5);
  assert.ok(contrast(palette['--editor-gold-ink'], selected.background) >= 4.5);
});

test('all four explicit profile themes keep their selected colors and readable text independently of OS mode', () => {
  assert.doesNotMatch(profile, /prefers-color-scheme/, 'profile theme must follow its explicit cardTheme selection');
  const base = declarations(profile, '.profile-card');
  const surfaces = { ivory: '#fffdf8', ink: '#211e1a', champagne: '#efe2c7', stone: '#d8d3ca' };
  for (const [theme, background] of Object.entries(surfaces)) {
    const palette = theme === 'ivory' ? base : { ...base, ...declarations(profile, `.profile-card--theme-${theme}`) };
    assert.equal(palette['--card-paper'], background);
    for (const role of ['--card-ink', '--card-muted', '--card-accent']) {
      assert.ok(contrast(palette[role], background) >= 4.5, `${theme} ${role} must remain readable`);
    }
    assert.equal(palette['--card-avatar-paper'], '#fffdf8');
    assert.equal(palette['--card-avatar-ink'], '#725126');
  }
  assert.match(profile, /\.profile-card__crest-fallback\s*\{[^}]*color:\s*var\(--card-accent\)/);
  assert.equal(declarations(profile, '.profile-card__claim-toggle').background, 'transparent');
});

test('verified tag prioritizes the explicit card palette even under the OS-dark fallback', () => {
  const dark = verified.slice(verified.indexOf('@media (prefers-color-scheme: dark)'));
  const tag = declarations(dark, '.verified-tag');
  assert.equal(tag.color, 'var(--card-accent, var(--card-page-champagne, #d5bc8a))');
  assert.equal(tag['border-color'], tag.color);
  assert.equal(declarations(verified, '.verified-tag').color, 'var(--card-accent, var(--card-page-champagne, #80602d))');
  assert.ok(contrast('#d5bc8a', '#24211d') >= 4.5, 'standalone tags on dark social pages keep a readable fallback');
});
