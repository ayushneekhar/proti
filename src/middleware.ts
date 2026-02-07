import type { MiddlewareHandler } from "astro";

const ROOT_HOSTS = new Set(["neekhar.dev", "www.neekhar.dev"]);
const PASTE_HOST = "paste.neekhar.dev";
const PASTE_PATH_PREFIX = "/paste";

const shouldSkipRewrite = (pathname: string): boolean => {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_astro") ||
    pathname.startsWith("/_image") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/.well-known") ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
};

export const onRequest: MiddlewareHandler = async ({ url }, next) => {
  const { hostname, pathname, search } = url;

  if (ROOT_HOSTS.has(hostname) && (pathname === "/paste" || pathname.startsWith("/paste/"))) {
    const subdomainPath = pathname.slice(PASTE_PATH_PREFIX.length) || "/";
    return Response.redirect(`https://${PASTE_HOST}${subdomainPath}${search}`, 301);
  }

  if (hostname !== PASTE_HOST) {
    return next();
  }

  if (pathname === "/paste" || pathname.startsWith("/paste/")) {
    const cleanPath = pathname.slice(PASTE_PATH_PREFIX.length) || "/";
    return Response.redirect(`https://${PASTE_HOST}${cleanPath}${search}`, 308);
  }

  if (shouldSkipRewrite(pathname)) {
    return next();
  }

  const rewrittenPath = pathname === "/" ? "/paste" : `/paste${pathname}`;
  return next(rewrittenPath);
};
