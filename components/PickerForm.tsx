import { Icon } from './Icon'

/** A small GET form that picks one item (a clinic or a doctor) for a dashboard. */
export function PickerForm({
  name,
  label,
  value,
  options,
  submit,
}: {
  name: string
  label: string
  value: string
  options: { value: string; label: string }[]
  submit: string
}) {
  return (
    <form className="search-bar" style={{ maxWidth: 560 }}>
      <label htmlFor={name} className="visually-hidden">
        {label}
      </label>
      <select id={name} name={name} defaultValue={value} className="select" style={{ flex: '1 1 260px', borderRadius: 999 }}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button className="btn btn-secondary" type="submit">
        <Icon name="arrow" size={16} />
        {submit}
      </button>
    </form>
  )
}
