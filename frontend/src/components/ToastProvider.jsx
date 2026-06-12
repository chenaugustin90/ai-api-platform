import { CheckCircle2, Info, Loader2, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
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
        <AnimatePresence initial={false}>
          {toasts.map((toast) => <Toast key={toast.id} toast={toast} />)}
        </AnimatePresence>
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
    <motion.div
      layout
      className={`app-toast toast-${toast.type}`}
      initial={{ opacity: 0, y: -18, scale: .92, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -12, scale: .96, filter: 'blur(6px)' }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
    >
      <span className="app-toast-icon">
        <Icon className={toast.type === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
      </span>
      <span>
        <strong>{toast.title}</strong>
        {toast.message && <small>{toast.message}</small>}
      </span>
    </motion.div>
  )
}
