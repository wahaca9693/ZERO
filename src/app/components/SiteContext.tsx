"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";

type SiteContextValue = {
  basePath: string;           // "" for main platform, "/sites/xyz" for reseller
  isResellerSite: boolean;    // true if we're on a reseller sub-site
  slug?: string;              // reseller slug if applicable
};

const SiteContext = createContext<SiteContextValue>({
  basePath: "",
  isResellerSite: false,
  slug: undefined,
});

/**
 * Provider that wraps the app to provide the current site context.
 * On the main platform, basePath = "".
 * On a reseller site, basePath = "/sites/{slug}".
 */
interface SiteContextProviderProps {
  children: ReactNode;
  basePath?: string;
  isResellerSite?: boolean;
  slug?: string;
}

export function SiteContextProvider({ 
  children, 
  basePath = "", 
  isResellerSite = false, 
  slug 
}: SiteContextProviderProps) {
  const value = useMemo(
    () => ({ basePath, isResellerSite, slug }),
    [basePath, isResellerSite, slug]
  );

  return (
    <SiteContext.Provider value={value}>
      {children}
    </SiteContext.Provider>
  );
}

/**
 * Hook to access the current site context.
 * Returns the base path for generating correct links.
 */
export function useSiteContext(): SiteContextValue {
  return useContext(SiteContext);
}

/**
 * Helper to generate the correct path for the current site context.
 * Prepends the base path if we're on a reseller site.
 */
export function useSitePath(): (path: string) => string {
  const { basePath } = useSiteContext();
  
  return useMemo(
    () => (path: string) => {
      // Ensure path starts with /
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      
      // If we're on a reseller site and the path is not already absolute/external
      if (basePath && !path.startsWith("http") && !path.startsWith("//")) {
        // Avoid double slashes
        const cleanBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const cleanPath = normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
        return `${cleanBase}${cleanPath}`;
      }
      
      return normalizedPath;
    },
    [basePath]
  );
}

/**
 * Hook to get the correct API base path for the current site.
 * Main platform: "" (uses /api/...)
 * Reseller site: "/sites/{slug}" (uses /api/sites/{slug}/...)
 */
export function useApiBasePath(): string {
  const { basePath, isResellerSite, slug } = useSiteContext();
  
  return useMemo(() => {
    if (isResellerSite && slug) {
      return `${basePath}/api`;
    }
    return "/api";
  }, [basePath, isResellerSite, slug]);
}