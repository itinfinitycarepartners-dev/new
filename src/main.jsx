import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals'

// Performance monitoring
onCLS(console.log)
onINP(console.log)
onFCP(console.log)
onLCP(console.log)
onTTFB(console.log)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
