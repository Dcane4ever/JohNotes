export const THEMES = {
  'dark-purple': {
    name: 'Dark Purple',
    emoji: '🌙',
    dark: true,
    bg: '#0f0f13',
    surface1: '#12121a',
    surface2: '#16161e',
    surface3: '#1e1e2a',
    border: '#2a2a35',
    text: '#e2e2e7',
    textMuted: '#9ca3af',
    textFaint: '#4b5563',
    accent: '#c084fc',
    accentBg: 'rgba(192,132,252,0.1)',
    accentBtn: '#7c3aed',
  },
  'ocean': {
    name: 'Ocean',
    emoji: '🌊',
    dark: true,
    bg: '#0a0f1a',
    surface1: '#0d1525',
    surface2: '#111b30',
    surface3: '#162040',
    border: '#1e2d4a',
    text: '#e0eaff',
    textMuted: '#7b9cc4',
    textFaint: '#3d5a7a',
    accent: '#38bdf8',
    accentBg: 'rgba(56,189,248,0.1)',
    accentBtn: '#0284c7',
  },
  'forest': {
    name: 'Forest',
    emoji: '🌿',
    dark: true,
    bg: '#080f0a',
    surface1: '#0d1a10',
    surface2: '#112015',
    surface3: '#162a1b',
    border: '#1e3525',
    text: '#e0f0e5',
    textMuted: '#7aaa88',
    textFaint: '#3a6048',
    accent: '#4ade80',
    accentBg: 'rgba(74,222,128,0.1)',
    accentBtn: '#16a34a',
  },
  'sepia': {
    name: 'Sepia',
    emoji: '📜',
    dark: false,
    bg: '#f5f0e8',
    surface1: '#ede8dc',
    surface2: '#e8e2d4',
    surface3: '#ddd6c4',
    border: '#c8bfa8',
    text: '#2c2416',
    textMuted: '#7a6a50',
    textFaint: '#a8987c',
    accent: '#b45309',
    accentBg: 'rgba(180,83,9,0.1)',
    accentBtn: '#92400e',
  },
  'light': {
    name: 'Light',
    emoji: '☀️',
    dark: false,
    bg: '#f0f0f8',
    surface1: '#e8e8f0',
    surface2: '#ededf5',
    surface3: '#dcdce8',
    border: '#d4d4e0',
    text: '#1a1a2e',
    textMuted: '#6b7280',
    textFaint: '#a0a0b8',
    accent: '#7c3aed',
    accentBg: 'rgba(124,58,237,0.08)',
    accentBtn: '#7c3aed',
  },
}

export function applyTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--bg', t.bg)
  r.setProperty('--surface1', t.surface1)
  r.setProperty('--surface2', t.surface2)
  r.setProperty('--surface3', t.surface3)
  r.setProperty('--border', t.border)
  r.setProperty('--text', t.text)
  r.setProperty('--text-muted', t.textMuted)
  r.setProperty('--text-faint', t.textFaint)
  r.setProperty('--accent', t.accent)
  r.setProperty('--accent-bg', t.accentBg)
  r.setProperty('--accent-btn', t.accentBtn)
  document.body.style.background = t.bg
  document.body.style.color = t.text
}
