import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  dark?: boolean;
}

export function Label({ className, dark = false, ...props }: LabelProps) {
  return (
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
