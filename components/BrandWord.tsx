/** The booktabib wordmark: the name followed by the red dot from the logo. Always reads left to right. */
export default function BrandWord({ text }: { text: string }) {
  return (
    <span className="brand-word" dir="ltr">
      {text}
      <span className="brand-dot" aria-hidden="true" />
    </span>
  )
}
