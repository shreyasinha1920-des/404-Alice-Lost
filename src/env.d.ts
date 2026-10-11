/// <reference types="vite/client" />

declare module 'virtual:illustrations' {
  const manifest: Record<string, Partial<Record<'bg' | 'mid' | 'fg', string>>>;
  export default manifest;
}
