import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Notebook from './pages/Notebook'
import Books from './pages/Books'
import Schedule from './pages/Schedule'
import RRL from './pages/RRL'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('johnotes-theme') || 'dark')

  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#0f0f13' : '#f0f0f8'
    document.body.style.color = theme === 'dark' ? '#e2e2e7' : '#1a1a2e'
    localStorage.setItem('johnotes-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <BrowserRouter basename="/JohNotes">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main style={{ flex: 1, overflow: 'auto', background: theme === 'dark' ? '#0f0f13' : '#f0f0f8' }}>
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
