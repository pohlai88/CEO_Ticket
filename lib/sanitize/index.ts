import DOMPurify from 'dompurify';

/**
 * Sanitize markdown-like HTML to prevent XSS while preserving safe formatting
 */
export function sanitizeContent(dirtyHTML: string): string {
  const config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
  };

  return DOMPurify.sanitize(dirtyHTML, config);
}

/**
 * Sanitize plain text input (no HTML allowed)
 */
export function sanitizeText(dirtyText: string): string {
  return DOMPurify.sanitize(dirtyText, { ALLOWED_TAGS: [] });
}
