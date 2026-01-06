// Placeholder components - will be replaced with shadcn/ui later
export function Card({ children, className = '', ...props }: any) {
  return <div className={`border rounded-lg ${className}`} {...props}>{children}</div>;
}

export function CardHeader({ children, className = '', ...props }: any) {
  return <div className={`p-6 ${className}`} {...props}>{children}</div>;
}

export function CardTitle({ children, className = '', ...props }: any) {
  return <h3 className={`text-2xl font-semibold ${className}`} {...props}>{children}</h3>;
}

export function CardDescription({ children, className = '', ...props }: any) {
  return <p className={`text-sm text-nx-text-muted ${className}`} {...props}>{children}</p>;
}

export function CardContent({ children, className = '', ...props }: any) {
  return <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>;
}

export function CardFooter({ children, className = '', ...props }: any) {
  return <div className={`p-6 pt-0 ${className}`} {...props}>{children}</div>;
}
