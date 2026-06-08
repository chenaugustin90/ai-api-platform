import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import './styles.css'
import './i18n'
import I18nTextSync from './components/I18nTextSync'
import Layout from './components/Layout'
import LiquidGlassEffects from './components/LiquidGlassEffects'
import ProtectedRoute from './components/ProtectedRoute'
import { getStoredTheme } from './components/ThemeToggle'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider } from './context/AuthContext'
const Account = lazy(() => import('./pages/Account'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Docs = lazy(() => import('./pages/Docs'))
const History = lazy(() => import('./pages/History'))
const ImageGeneration = lazy(() => import('./pages/ImageGeneration'))
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Playground = lazy(() => import('./pages/Playground'))
const ProviderSettings = lazy(() => import('./pages/ProviderSettings'))
const PromptLibrary = lazy(() => import('./pages/PromptLibrary'))
const Pricing = lazy(() => import('./pages/Pricing'))
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const Register = lazy(() => import('./pages/Register'))
const SharedPreview = lazy(() => import('./pages/SharedPreview'))
const Settings = lazy(() => import('./pages/Settings'))
const Upgrade = lazy(() => import('./pages/Upgrade'))
const Usage = lazy(() => import('./pages/Usage'))
const VideoGeneration = lazy(() => import('./pages/VideoGeneration'))

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
      { path: '/billing/success', element: <PaymentSuccess /> },
      { path: '/billing/cancel', element: <PaymentCancel /> },
      { path: '/upgrade', element: <Upgrade /> },
      { path: '/playground', element: <Playground /> },
      { path: '/prompt-library', element: <PromptLibrary /> },
      { path: '/history', element: <History /> },
      { path: '/account', element: <Account /> },
      { path: '/docs', element: <Docs /> },
      { path: '/images', element: <ImageGeneration /> },
      { path: '/videos', element: <VideoGeneration /> },
      { path: '/usage', element: <Usage /> },
      { path: '/settings', element: <Settings /> },
      { path: '/settings/providers', element: <ProviderSettings /> }
    ]
  }
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <I18nTextSync />
        <LiquidGlassEffects />
        <Suspense fallback={<div className="app-route-loading"><span /></div>}>
          <RouterProvider router={router} />
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
)
