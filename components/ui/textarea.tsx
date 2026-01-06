// Placeholder textarea component
export function Textarea({ className = '', ...props }: any) {
  return (
    <textarea
      className={`w-full px-3 py-2 border border-nx-border-strong rounded-md focus:outline-none focus:ring-2 focus:ring-nx-ring ${className}`}
      {...props}
    />
  );
}
