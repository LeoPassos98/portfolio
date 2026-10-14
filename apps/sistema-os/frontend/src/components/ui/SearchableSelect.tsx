import {
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { Input } from './Input'

type SearchableSelectOption = {
  label: string
  searchTerms?: readonly string[]
  value: string
}

type SearchableSelectProps = {
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  defaultValue?: string
  emptyMessage: string
  id: string
  name: string
  onValueChange?: (value: string) => void
  options: readonly SearchableSelectOption[]
  placeholder: string
}

function SearchableSelect({
  ariaDescribedBy,
  ariaInvalid,
  defaultValue,
  emptyMessage,
  id,
  name,
  onValueChange,
  options,
  placeholder,
}: SearchableSelectProps) {
  const initialSelectedOption =
    options.find((option) => option.value === defaultValue) ?? null
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(initialSelectedOption?.label ?? '')
  const [selectedValue, setSelectedValue] = useState<string | null>(
    initialSelectedOption?.value ?? null,
  )
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedOption =
    options.find((option) => option.value === selectedValue) ?? null
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filteredOptions =
    normalizedQuery === '' || selectedOption?.label === query
      ? options
      : options.filter((option) =>
          [option.label, ...(option.searchTerms ?? [])]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .includes(normalizedQuery),
        )
  const listboxId = `${id}-options`
  const selectionStatusId = `${id}-selection`
  const activeOption = filteredOptions[activeOptionIndex]

  function getOptionId(option: SearchableSelectOption) {
    return `${id}-option-${option.value}`
  }

  function selectOption(option: SearchableSelectOption) {
    setSelectedValue(option.value)
    setQuery(option.label)
    setActiveOptionIndex(-1)
    setIsOpen(false)
    onValueChange?.(option.value)
  }

  function closeOptions() {
    setIsOpen(false)
    setActiveOptionIndex(-1)
    setQuery(selectedOption?.label ?? '')
  }

  function handleInputFocus(event: FocusEvent<HTMLInputElement>) {
    event.currentTarget.select()
    setIsOpen(true)
    setActiveOptionIndex(
      Math.max(
        filteredOptions.findIndex(
          (option) => option.value === selectedOption?.value,
        ),
        0,
      ),
    )
  }

  function handleInputChange(value: string) {
    setQuery(value)
    setSelectedValue(null)
    setActiveOptionIndex(0)
    setIsOpen(true)
    onValueChange?.('')
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeOptions()
      return
    }

    if (event.key === 'Enter' && isOpen && activeOption) {
      event.preventDefault()
      selectOption(activeOption)
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    event.preventDefault()
    setIsOpen(true)

    if (filteredOptions.length === 0) {
      return
    }

    setActiveOptionIndex((currentIndex) => {
      if (event.key === 'ArrowDown') {
        return (currentIndex + 1) % filteredOptions.length
      }

      return (
        (currentIndex - 1 + filteredOptions.length) % filteredOptions.length
      )
    })
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        closeOptions()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [selectedOption])

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        role="combobox"
        type="text"
        autoComplete="off"
        aria-activedescendant={
          isOpen && activeOption ? getOptionId(activeOption) : undefined
        }
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-describedby={[selectionStatusId, ariaDescribedBy]
          .filter(Boolean)
          .join(' ')}
        aria-expanded={isOpen}
        aria-invalid={ariaInvalid}
        placeholder={placeholder}
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        onBlur={() => {
          window.setTimeout(() => {
            if (!containerRef.current?.contains(document.activeElement)) {
              closeOptions()
            }
          }, 0)
        }}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
      />
      <input name={name} type="hidden" value={selectedValue ?? ''} />

      <p
        id={selectionStatusId}
        aria-live="polite"
        className="text-neutral mt-2 text-sm"
      >
        {selectedOption
          ? `Selecionado: ${selectedOption.label}`
          : 'Nenhuma opção selecionada'}
      </p>

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={placeholder}
          className="bg-surface absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-ui border border-neutral-bg p-1 shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <li className="text-neutral px-3 py-2 text-sm">{emptyMessage}</li>
          ) : (
            filteredOptions.map((option, index) => {
              const isActive = index === activeOptionIndex
              const isSelected = option.value === selectedValue

              return (
                <li key={option.value}>
                  <button
                    id={getOptionId(option)}
                    type="button"
                    role="option"
                    tabIndex={-1}
                    aria-selected={isSelected}
                    className={[
                      'w-full',
                      'rounded-ui',
                      'px-3',
                      'py-2',
                      'text-left',
                      'text-sm',
                      'focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-primary',
                      'focus-visible:ring-offset-2',
                      isActive && 'bg-neutral-bg',
                      isSelected && 'text-primary',
                      !isSelected && 'text-foreground',
                      'hover:bg-neutral-bg',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectOption(option)}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}

export {
  SearchableSelect,
  type SearchableSelectOption,
}
