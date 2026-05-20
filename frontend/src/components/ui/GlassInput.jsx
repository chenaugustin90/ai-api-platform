import { cn } from './utils'

export default function GlassInput({ className = '', ...props }) {
  return <input className={cn('lg-control lg-input', className)} {...props} />
}
