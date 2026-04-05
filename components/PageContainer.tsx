import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** Tailwind max-width class, e.g. max-w-6xl */
  maxWidthClass?: string;
};

/**
 * Horizontally centered content with responsive horizontal padding and overflow safety.
 */
export default function PageContainer({
  children,
  className = "",
  maxWidthClass = "max-w-6xl",
}: PageContainerProps) {
  return (
    <div
      className={`mx-auto w-full min-w-0 max-w-full px-4 sm:px-6 ${maxWidthClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
