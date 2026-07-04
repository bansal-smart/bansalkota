import { useEffect, useRef, useState } from "react";
import { searchCities } from "@/lib/indianCities";

type Props = {
  value: string;
  onChange: (city: string) => void;
  onSelectCity?: (city: string, state: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export default function CityAutocompleteInput({
  value,
  onChange,
  onSelectCity,
  id,
  name,
  placeholder,
  className,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const suggestions = searchCities(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectSuggestion = (city: string, state: string) => {
    onChange(city);
    onSelectCity?.(city, state);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const s = suggestions[highlight];
            if (s) selectSuggestion(s.city, s.state);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <li key={`${s.city}-${s.state}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s.city, s.state)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${i === highlight ? "bg-muted" : ""}`}
              >
                {s.city} <span className="text-muted-foreground">, {s.state}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
