import { useId, type ReactElement, type SelectHTMLAttributes } from 'react'
import { joinClasses } from '@/utils/joinClasses.ts'
import styles from './Select.module.css'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
}

export function Select({
  label,
  options,
  id,
  className,
  ...props
}: SelectProps): ReactElement {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={joinClasses(styles.field, className)}>
      <label className={styles.label} htmlFor={selectId}>
        {label}
      </label>
      <div className={styles.control}>
        <select id={selectId} className={styles.select} {...props}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
