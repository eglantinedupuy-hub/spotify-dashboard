import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  href?: string; // if set, the whole card is clickable
  className?: string;
};

/** Rounded dark card. Lifts slightly and brightens on hover when clickable. */
export function Card({ children, href, className = "" }: CardProps) {
  const base = `rounded-2xl bg-card p-4 sm:p-5 transition duration-200 ${className}`;
  if (!href) return <div className={base}>{children}</div>;
  return (
    <Link
      href={href}
      className={`${base} block hover:-translate-y-0.5 hover:bg-card-hover focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {children}
    </Link>
  );
}
