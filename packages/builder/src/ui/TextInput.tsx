import type { InputHTMLAttributes, JSX } from "react";

/**
 * A text control, as a ruled line rather than as a box.
 *
 * Paper's whole idea is structure from space rather than from containers (`SPEC.md` §7.4), so a
 * field is a line you write on. The underline is the one border in the tool, and it thickens on
 * focus rather than moving anything — a control that reflows when you reach it is a control that
 * feels broken on a phone.
 */
export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return (
    <input
      className={`tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg placeholder:text-ink-quiet/60 focus:border-ink ${className ?? ""}`.trim()}
      {...rest}
    />
  );
}
