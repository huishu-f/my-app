import type { InputProps } from "@my-app/shared";

export function Input({
  leftIcon,
  rightElement,
  error,
  success,
  className = "",
  ref,
  ...props
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const hasAffix = Boolean(leftIcon || rightElement);

  const inputClass = [
    "input-field input-focus",
    leftIcon ? "pl-10" : "",
    rightElement ? "pr-10" : "",
    error ? "input-error" : success ? "input-success" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inputProps = { "aria-invalid": error || undefined, ...props };

  if (!hasAffix) {
    return <input ref={ref} className={inputClass} {...inputProps} />;
  }

  return (
    <div className="input-icon-wrap">
      {leftIcon && <span className="input-icon">{leftIcon}</span>}
      <input ref={ref} className={inputClass} {...inputProps} />

      {rightElement && (
        <span className="absolute top-1/2 right-3 -translate-y-1/2">{rightElement}</span>
      )}
    </div>
  );
}
