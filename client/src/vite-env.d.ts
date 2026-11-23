/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly API_BASE_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly PUBLIC_URL?: string;
  readonly VITE_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
