import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  dark?: boolean;
}

export function Label({ className, dark = false, ...props }: LabelProps) {
  return (
    // Generic wrapper: the association is supplied by the caller — either a
    // control passed as children or `htmlFor` — and both arrive through
    // {...props}, where a static rule cannot see them. Callers are still linted.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn(
        "block text-xs uppercase tracking-widest mb-1.5",
        dark ? "text-pos-gray" : "text-gray-400",
        className
      )}
      {...props}
    />
  );
}
