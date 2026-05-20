import { cn } from './utils'

export default function GlassButton({
  as: Component = 'button',
  className = '',
  variant = 'primary',
  size = 'md',
  type,
  children,
  ...props
}) {
  const buttonProps = Component === 'button' ? { type: type || 'button' } : {}

  return (
    <Component className={cn('lg-button', `lg-button-${variant}`, `lg-button-${size}`, className)} {...buttonProps} {...props}>
      {children}
    </Component>
  )
}
