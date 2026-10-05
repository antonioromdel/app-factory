import { useId, type InputHTMLAttributes, type ReactElement } from 'react'
import styles from './Switch.module.css'

interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string
}

export function Switch({ label, id, ...props }: SwitchProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className={styles.field} htmlFor={inputId}>
      <input
        {...props}
        id={inputId}
        className={styles.input}
        type="checkbox"
        role="switch"
      />
      <span className={styles.track} aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}
