import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { applyTheme, loadThemeCache } from './theme'

// Paint with the restaurant's last known colors from the first frame.
applyTheme(document.documentElement, loadThemeCache(window.localStorage, window.location.host))

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
