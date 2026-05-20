import { cn } from './utils'

export default function GlassTextarea({ className = '', ...props }) {
  return <textarea className={cn('lg-control lg-textarea', className)} {...props} />
}
