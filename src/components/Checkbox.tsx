import { useId, type InputHTMLAttributes, type ReactElement } from 'react'
import styles from './Checkbox.module.css'

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  label: string
}

export function Checkbox({ label, id, ...props }: CheckboxProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label className={styles.field} htmlFor={inputId}>
      <input id={inputId} className={styles.input} type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  )
}
