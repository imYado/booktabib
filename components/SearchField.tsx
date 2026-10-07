import { Icon } from './Icon'

/** Black pill search input with the search button inside it, at the end. */
export function SearchField({ placeholder, defaultValue, submitLabel }: { placeholder: string; defaultValue?: string; submitLabel: string }) {
  return (
    <div className="search-field">
      <label htmlFor="q" className="visually-hidden">
        {placeholder}
      </label>
      <input id="q" name="q" type="search" className="search-input" placeholder={placeholder} defaultValue={defaultValue} />
      <button type="submit" className="search-submit" aria-label={submitLabel}>
        <Icon name="search" size={20} />
      </button>
    </div>
  )
}
