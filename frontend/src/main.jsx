import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './styles.css'
import Layout from './components/Layout'
import LiquidGlassEffects from './components/LiquidGlassEffects'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import ApiKeys from './pages/ApiKeys'
import Dashboard from './pages/Dashboard'
import Docs from './pages/Docs'
import ImageGeneration from './pages/ImageGeneration'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Playground from './pages/Playground'
import Pricing from './pages/Pricing'
import Register from './pages/Register'
import Usage from './pages/Usage'
import VideoGeneration from './pages/VideoGeneration'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
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
      { path: '/playground', element: <Playground /> },
      { path: '/docs', element: <Docs /> },
      { path: '/images', element: <ImageGeneration /> },
      { path: '/videos', element: <VideoGeneration /> },
      { path: '/usage', element: <Usage /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LiquidGlassEffects />
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
