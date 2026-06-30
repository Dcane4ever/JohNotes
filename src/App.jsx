import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Notebook from './pages/Notebook'
import Books from './pages/Books'
import Schedule from './pages/Schedule'
import RRL from './pages/RRL'

export default function App() {
  return (
    <BrowserRouter basename="/JohNotes">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<Notebook />} />
            <Route path="/books" element={<Books />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/rrl" element={<RRL />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
