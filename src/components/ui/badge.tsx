import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "success" | "warning" | "danger";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase",
        {
          "bg-gray-100 text-gray-600": variant === "default",
          "bg-gold-light text-gold-dark": variant === "gold",
          "bg-green-50 text-green-700": variant === "success",
          "bg-yellow-50 text-yellow-700": variant === "warning",
          "bg-red-50 text-red-700": variant === "danger",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
