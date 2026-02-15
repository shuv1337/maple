import { useState, useRef, useEffect } from "react"

export function InlineEditableTitle({
  value,
  onChange,
  readOnly = false,
}: {
  value: string
  onChange: (name: string) => void
  readOnly?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleSubmit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onChange(trimmed)
    } else {
      setDraft(value)
    }
    setIsEditing(false)
  }

  if (isEditing && !readOnly) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(value)
              setIsEditing(false)
            }
          }}
          className="text-2xl font-bold tracking-tight bg-transparent border-b border-foreground/20 outline-none focus:border-foreground/50 w-full"
        />
      </form>
    )
  }

  return (
    <h1
      role="button"
      tabIndex={0}
      onClick={() => {
        if (readOnly) return
        setIsEditing(true)
      }}
      onKeyDown={(e) => {
        if (readOnly) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      aria-disabled={readOnly}
      className={
        readOnly
          ? "text-2xl font-bold tracking-tight"
          : "text-2xl font-bold tracking-tight cursor-pointer hover:text-foreground/80"
      }
    >
      {value}
    </h1>
  )
}
