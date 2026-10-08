import {
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { joinClasses } from '@/utils/joinClasses.ts'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hideLabel?: boolean
  error?: string
  leading?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Input({
  label,
  hideLabel = false,
  error,
  leading,
  id,
  className,
  ref,
  ...props
}: InputProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={joinClasses(styles.field, className)}>
      <label
        className={hideLabel ? styles.hiddenLabel : styles.label}
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className={styles.control}>
        {leading}
        <input
          {...props}
          ref={ref}
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
        />
      </div>
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
