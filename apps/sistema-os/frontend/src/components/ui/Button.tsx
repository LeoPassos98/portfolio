import type { ComponentPropsWithoutRef } from "react";

type ButtonProps = ComponentPropsWithoutRef<"button">;

function Button({ children, className, ...props }: ButtonProps) {
  const classes = [
    "bg-primary",
    "hover:bg-primary-hover",
    "focus-visible:ring-primary",
    "rounded-ui",
    "px-4",
    "py-2",
    "text-white",
    "focus-visible:ring-2",
    "focus-visible:ring-offset-2",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed",
    "disabled:opacity-50",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

export { Button };
