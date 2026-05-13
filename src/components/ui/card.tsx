import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export function Card({ children, className, dark = false }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-5",
        dark
          ? "bg-admin-sidebar text-pos-cream"
          : "bg-white border border-gray-100 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-sm font-semibold text-gray-700", className)}>{children}</h3>;
}
