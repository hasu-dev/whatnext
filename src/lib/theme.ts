// Keeps <meta name="theme-color"> in step with the active theme × mode —
// browsers tint their chrome from this tag, and the static default
// (archive-light accent) reads as broken over a dark page. Light chrome
// keeps following the accent; dark chrome follows the page background.
export function syncMetaThemeColor() {
  const root = document.documentElement
  const token = root.dataset.mode === 'dark' ? '--bg' : '--accent'
  const value = getComputedStyle(root).getPropertyValue(token).trim()
  if (value) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value)
}
