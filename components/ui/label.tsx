// Placeholder label component
export function Label({ children, className = '', htmlFor, ...props }: any) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-nx-text-sub ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
