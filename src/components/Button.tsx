import type { ButtonHTMLAttributes, ReactElement } from 'react'
import { joinClasses } from '@/utils/joinClasses.ts'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  variant = 'primary',
  type = 'button',
  className,
  ...props
}: ButtonProps): ReactElement {
  return (
    <button
      type={type}
      className={joinClasses(styles.button, styles[variant], className)}
      {...props}
    />
  )
}
