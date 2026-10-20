import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-medium whitespace-nowrap select-none transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:bg-sunken disabled:text-faint disabled:shadow-none";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary:
    "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink)]",
  quiet: "px-3 text-muted hover:bg-sunken hover:text-ink",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

export function ButtonLink({
  variant,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Button({
  variant,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}
