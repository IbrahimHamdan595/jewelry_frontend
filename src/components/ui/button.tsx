import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded transition-colors disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-gold hover:bg-gold-dark text-white": variant === "primary",
            "bg-gray-100 hover:bg-gray-200 text-gray-800": variant === "secondary",
            "hover:bg-gray-100 text-gray-600": variant === "ghost",
            "bg-red-600 hover:bg-red-700 text-white": variant === "danger",
            "border border-gray-200 hover:bg-gray-50 text-gray-700": variant === "outline",
          },
          {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2.5 text-sm": size === "md",
            "px-6 py-3 text-sm": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
