import { cn } from './utils'

export default function GlassCard({ as: Component = 'div', className = '', variant = 'default', children, ...props }) {
  return (
    <Component className={cn('lg-card', variant !== 'default' && `lg-card-${variant}`, className)} {...props}>
      {children}
    </Component>
  )
}
