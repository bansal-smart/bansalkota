import * as React from "react";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> & {
  value: string;
  onChange: (digits: string) => void;
};

/**
 * Restricted input that accepts at most 10 digits.
 * Strips any non-digit characters as the user types.
 */
export const PhoneField = React.forwardRef<HTMLInputElement, Props>(
  ({ className, value, onChange, placeholder = "10-digit mobile", ...rest }, ref) => (
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      pattern="[6-9][0-9]{9}"
      maxLength={10}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...rest}
    />
  ),
);
PhoneField.displayName = "PhoneField";

export default PhoneField;
