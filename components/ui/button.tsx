// Placeholder button component
export function Button({ children, variant = 'default', className = '', ...props }: any) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variants: Record<string, string> = {
    default: 'bg-nx-primary text-nx-text-inverse hover:bg-nx-primary-hover',
    outline: 'border border-nx-border-strong hover:bg-nx-surface-well',
    ghost: 'hover:bg-nx-surface-well',
    destructive: 'bg-nx-danger text-nx-text-inverse hover:bg-nx-danger-hover',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
