import { CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const pushToast = useCallback((toast) => {
    const id = crypto.randomUUID()
    const nextToast = { id, type: toast.type || 'info', title: toast.title, message: toast.message }
    setToasts((current) => [nextToast, ...current].slice(0, 4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, toast.duration || 3600)
    return id
  }, [])

  const value = useMemo(() => ({
    success: (message, title = 'Success') => pushToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => pushToast({ type: 'error', title, message, duration: 5200 }),
    loading: (message, title = 'Working') => pushToast({ type: 'loading', title, message, duration: 2400 }),
    info: (message, title = 'Note') => pushToast({ type: 'info', title, message }),
  }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) return { success: () => {}, error: () => {}, loading: () => {}, info: () => {} }
  return context
}

function Toast({ toast }) {
  const Icon = toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : toast.type === 'loading' ? Loader2 : Info
  return (
    <div className={`app-toast toast-${toast.type}`}>
      <span className="app-toast-icon">
        <Icon className={toast.type === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      </span>
      <span>
        <strong>{toast.title}</strong>
        {toast.message && <small>{toast.message}</small>}
      </span>
    </div>
  )
}
