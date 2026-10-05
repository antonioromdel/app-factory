import { useId, type ReactElement, type TextareaHTMLAttributes } from 'react'
import { joinClasses } from '@/utils/joinClasses.ts'
import styles from './TextArea.module.css'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function TextArea({
  label,
  id,
  className,
  ...props
}: TextAreaProps): ReactElement {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={joinClasses(styles.field, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <textarea id={inputId} className={styles.input} {...props} />
    </div>
  )
}
