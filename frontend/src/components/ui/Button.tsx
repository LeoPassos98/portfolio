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
