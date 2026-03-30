const KEY = 'dwallet_theme'

export function getTheme() {
  return (
    localStorage.getItem(KEY) ||
    (window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark')
  )
}

export function setTheme(theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}

export function applyTheme(theme) {
  const r = document.documentElement
  if (theme === 'light') {
    r.style.setProperty('--bg', '#ffffff')
    r.style.setProperty('--bg2', '#f8f9fa')
    r.style.setProperty('--bg3', '#f0f2f5')
    r.style.setProperty('--bg4', '#e4e6ea')
    r.style.setProperty('--text', '#0d0f14')
    r.style.setProperty('--text2', '#4a5568')
    r.style.setProperty('--text3', '#9aa5b4')
    r.style.setProperty('--border', 'rgba(0,0,0,0.1)')
    r.setAttribute('data-theme', 'light')
  } else {
    ;[
      '--bg',
      '--bg2',
      '--bg3',
      '--bg4',
      '--text',
      '--text2',
      '--text3',
      '--border',
    ].forEach(v => r.style.removeProperty(v))
    r.setAttribute('data-theme', 'dark')
  }
}

export function initTheme() {
  applyTheme(getTheme())
}
