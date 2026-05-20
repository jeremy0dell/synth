/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_ENABLE_GOOGLE_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
