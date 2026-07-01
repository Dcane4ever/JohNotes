import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Notebook from './pages/Notebook'
import Books from './pages/Books'
import Schedule from './pages/Schedule'
import RRL from './pages/RRL'
import { THEMES, applyTheme } from './lib/themes'

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('ameno-theme') || 'dark-purple')

  useEffect(() => {
    const t = THEMES[themeKey] || THEMES['dark-purple']
    applyTheme(t)
    localStorage.setItem('ameno-theme', themeKey)
  }, [themeKey])

  const theme = THEMES[themeKey] || THEMES['dark-purple']

  return (
    <BrowserRouter basename="/JohNotes">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar themeKey={themeKey} theme={theme} onThemeChange={setThemeKey} />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
          <Routes>
            <Route path="/" element={<Notebook theme={theme} />} />
            <Route path="/books" element={<Books theme={theme} />} />
            <Route path="/schedule" element={<Schedule theme={theme} />} />
            <Route path="/rrl" element={<RRL theme={theme} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
