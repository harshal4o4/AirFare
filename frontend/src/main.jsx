import { StrictMode, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './login.css'
import './home.css'
import HomePage from './HomePage'
import LoginPage from './LoginPage'

function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)

  const handleLogin = useCallback((userData) => {
    setUser(userData)
    setPage('home')
  }, [])

  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} />
  }

  return <HomePage user={user} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
