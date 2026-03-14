/**
 * Type definitions for Next.js App Router route handlers
 */

/**
 * Generic route context type for dynamic routes with params
 * @template T The shape of the params object
 */
export type RouteContext<T extends Record<string, string> = Record<string, string>> = {
  params: Promise<T>;
};

/**
 * Default route context with empty params for handlers that need optional context
 */
export const defaultRouteContext: RouteContext = {
  params: Promise.resolve({}),
};

/**
 * Creates a default route context with specific param types
 * @template T The shape of the params object
 * @param defaultParams Default values for the params
 * @returns RouteContext with default params
 */
export function createDefaultRouteContext<T extends Record<string, string>>(
  defaultParams: T
): RouteContext<T> {
  return {
    params: Promise.resolve(defaultParams),
  };
}
