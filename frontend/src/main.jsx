import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './styles.css'
import Layout from './components/Layout'
import LiquidGlassEffects from './components/LiquidGlassEffects'
import ProtectedRoute from './components/ProtectedRoute'
import { getStoredTheme } from './components/ThemeToggle'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './context/AuthContext'
import Account from './pages/Account'
import ApiKeys from './pages/ApiKeys'
import Dashboard from './pages/Dashboard'
import Docs from './pages/Docs'
import History from './pages/History'
import ImageGeneration from './pages/ImageGeneration'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Playground from './pages/Playground'
import ProviderSettings from './pages/ProviderSettings'
import PromptLibrary from './pages/PromptLibrary'
import Pricing from './pages/Pricing'
import Register from './pages/Register'
import SharedPreview from './pages/SharedPreview'
import Upgrade from './pages/Upgrade'
import Usage from './pages/Usage'
import VideoGeneration from './pages/VideoGeneration'

if (getStoredTheme() === 'light') {
  document.body.classList.add('theme-light')
  document.documentElement.style.colorScheme = 'light'
}

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/share/:id', element: <SharedPreview /> },
  {
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/api-keys', element: <ApiKeys /> },
      { path: '/pricing', element: <Pricing /> },
      { path: '/upgrade', element: <Upgrade /> },
      { path: '/playground', element: <Playground /> },
      { path: '/prompt-library', element: <PromptLibrary /> },
      { path: '/history', element: <History /> },
      { path: '/account', element: <Account /> },
      { path: '/docs', element: <Docs /> },
      { path: '/images', element: <ImageGeneration /> },
      { path: '/videos', element: <VideoGeneration /> },
      { path: '/usage', element: <Usage /> },
      { path: '/settings/providers', element: <ProviderSettings /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <LiquidGlassEffects />
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
)
