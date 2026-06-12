import { Navigate } from 'react-router-dom'
import { getToken } from '../api/client'

export default function AppEntry() {
  return <Navigate to={getToken() ? '/dashboard' : '/login'} replace />
}
