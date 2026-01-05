// Placeholder button component
export function Button({ children, variant = 'default', className = '', ...props }: any) {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  const variants: Record<string, string> = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 hover:bg-gray-100',
    ghost: 'hover:bg-gray-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
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
