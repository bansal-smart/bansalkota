import { ChevronDown } from "lucide-react";
import { useState } from "react";

const goals = ["IIT JEE", "NEET", "Boards", "JEE + NEET"];

interface GoalSelectorProps {
  value?: string;
  onChange?: (val: string) => void;
}

const GoalSelector = ({ value = "IIT JEE", onChange }: GoalSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-pill bg-primary-light px-3 py-1.5 text-sm font-bold font-display text-primary hover:bg-primary/10 transition-colors"
      >
        🎯 {value}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-40 rounded-lg border border-border bg-card shadow-lg py-1">
          {goals.map((g) => (
            <button
              key={g}
              onClick={() => { onChange?.(g); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-sm font-medium hover:bg-primary-light transition-colors ${g === value ? 'text-primary bg-primary-light' : 'text-foreground'}`}
            >
              {g}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalSelector;
