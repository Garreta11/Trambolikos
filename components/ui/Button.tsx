"use client";

import React from "react";

export type ButtonVariant = "primary" | "secondary";

type ButtonBaseProps = {
  variant: ButtonVariant;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

type ButtonAsAnchorProps = ButtonBaseProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

type ButtonAsButtonProps = ButtonBaseProps & {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

export type ButtonProps = ButtonAsAnchorProps | ButtonAsButtonProps;

export default function Button(props: ButtonProps) {
  const { variant, className, disabled, style, children } = props;
  const classes = `btn-${variant}${className ? ` ${className}` : ""}`;

  // En Info/Hero se usa como link (`<a>`). En Header se usa como botón (`<button>`).
  if (typeof props.href === "string") {
    const { href, target, rel, onClick } = props;

    return (
      <a
        href={href}
        className={classes}
        target={target}
        rel={rel}
        aria-disabled={disabled ? true : undefined}
        style={
          disabled
            ? { ...style, opacity: 0.5, pointerEvents: "none" }
            : style
        }
        onClick={
          disabled
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
              }
            : onClick
        }
      >
        {children}
      </a>
    );
  }

  const { type = "button", onClick } = props;

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      style={
        disabled
          ? { ...style, opacity: 0.5, pointerEvents: "none" }
          : style
      }
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}

