// Placeholder badge component
export function Badge({ children, variant = 'default', className = '', ...props }: any) {
  const variants: Record<string, string> = {
    default: 'bg-nx-primary-light text-nx-primary',
    secondary: 'bg-nx-surface-well text-nx-text-main',
    destructive: 'bg-nx-danger-bg text-nx-danger-text',
    outline: 'border border-nx-border-strong bg-nx-surface',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
