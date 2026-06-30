import { NavLink } from 'react-router-dom'
import { BookOpen, BookMarked, Calendar, FileText } from 'lucide-react'

const links = [
  { to: '/', icon: BookOpen, label: 'Notebook' },
  { to: '/books', icon: BookMarked, label: 'Books' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/rrl', icon: FileText, label: 'RRL' },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: '#16161e',
      borderRight: '1px solid #2a2a35',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 12px',
      gap: '4px',
    }}>
      <div style={{ padding: '0 12px 24px', borderBottom: '1px solid #2a2a35', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px', fontWeight: '700', color: '#c084fc', letterSpacing: '-0.5px' }}>
          JohNotes
        </span>
      </div>
      {links.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            color: isActive ? '#c084fc' : '#9ca3af',
            background: isActive ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
            transition: 'all 0.15s',
          })}
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  )
}
