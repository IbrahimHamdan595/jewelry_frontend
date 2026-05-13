import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  dark?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, dark = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded px-3 py-2.5 text-sm focus:outline-none transition-colors",
          dark
            ? "bg-white/5 border border-white/15 text-pos-cream placeholder-pos-gray/50 focus:border-gold"
            : "border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gold bg-white",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
