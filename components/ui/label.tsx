// Placeholder label component
export function Label({ children, className = '', htmlFor, ...props }: any) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
