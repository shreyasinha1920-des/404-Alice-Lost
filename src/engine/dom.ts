type Child = Node | string | null | undefined | false;

/**
 * Tiny element helper. Strings are always inserted as text, never HTML,
 * so it is safe to pass user-controlled values such as the broken URL.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: Child | Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** The path the visitor tried to reach, shortened for display. Text only. */
export function brokenPath(max = 64): string {
  let path = location.pathname + location.search;
  try {
    path = decodeURI(path);
  } catch {
    /* keep the raw path */
  }
  if (path === '/' || path === '/index.html' || path === '/404.html') path = '/a-page-that-isnt-here';
  return path.length > max ? path.slice(0, max - 1) + '…' : path;
}
