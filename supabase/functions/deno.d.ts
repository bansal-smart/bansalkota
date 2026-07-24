// Ambient Deno type definitions for TypeScript compilation in Supabase Edge Functions

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  }

  export const env: Env;

  export function serve(
    handler: (req: Request) => Response | Promise<Response>,
  ): void;
  export function serve(
    options: { port?: number; onListen?: (localAddr: { hostname: string; port: number }) => void },
    handler: (req: Request) => Response | Promise<Response>,
  ): void;

  export function readTextFile(path: string | URL): Promise<string>;
  export function writeTextFile(path: string | URL, data: string): Promise<void>;
}

declare module "https://*" {
  const content: any;
  export default content;
  export const createClient: any;
  export const serve: any;
}

declare module "npm:*" {
  const content: any;
  export default content;
}
