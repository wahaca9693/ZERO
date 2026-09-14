#!/usr/bin/env node
/**
 * Generates reseller branch pages from main platform pages automatically.
 * Usage: node scripts/generate-portal-pages.mjs
 *
 * For each page in the MAIN_PAGES list, it creates:
 *   src/app/sites/[slug]/(portal)/<page>/page.tsx  (server wrapper passing slug)
 *   src/app/sites/[slug]/(portal)/<page>/Portal<Name>.tsx (client component)
 *
 * Transformation rules:
 *   - Components import from "../../components/..." relative path
 *   - Sidebar/BottomNav/Header removed (ProviderShell provides them)
 *   - fetch("/api/...")  ->  fetch(`/api/sites/${slug}/...`)
 *   - router.push("/...") ->  router.push(`/sites/${slug}/...`)
 *   - Links href="/..." -> dynamic with slug
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const ROOT = process.cwd();
const MAIN_PAGES = [
  { src: "src/app/auto-refill/page.tsx", name: "auto-refill", label: "AutoRefill" },
  { src: "src/app/free-services/page.tsx", name: "free-services", label: "FreeServices" },
  { src: "src/app/settings/page.tsx", name: "settings", label: "Settings" },
  { src: "src/app/updates/page.tsx", name: "updates", label: "Updates" },
  { src: "src/app/terms/page.tsx", name: "terms", label: "Terms" },
];

function relativeImport(fromDir, toFile) {
  // Compute relative path from fromDir to toFile (both relative to ROOT)
  const fromParts = fromDir.split("/");
  const toParts = toFile.split("/");
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++;
  const up = fromParts.length - i;
  const down = toParts.slice(i).join("/").replace(/\.tsx$/, "").replace(/\.ts$/, "");
  const prefix = up > 0 ? "../".repeat(up) : "./";
  return prefix + down;
}

function transformContent(content, slugExpr, pageName) {
  let out = content;
  // -- Fix imports: components live 4 levels UP from (portal)/<page>/
  // (portal)/<page>/  ->  app/components  =  ../../../../components/
  out = out.replace(/from "\.\.\/components\//g, 'from "../../../../components/');
  out = out.replace(/from '\.\.\/components\//g, "from '../../../../components/");
  out = out.replace(/import "\.\.\/globals\.css"/g, 'import "../../../../globals.css"');

  // -- Replace DashboardLayout wrapper: pages here are rendered inside ProviderShell,
  //    so drop the DashboardLayout import and its JSX wrapper.
  const hasDash = out.includes("DashboardLayout");
  if (hasDash) {
    out = out.replace(/import DashboardLayout[^\n]*\n?/g, "");
    // Wrap the whole return in a plain fragment if DashboardLayout was the outer wrapper.
    out = out.replace(/<DashboardLayout>/g, "<>");
    out = out.replace(/<\/DashboardLayout>/g, "</>");
  }

  // Replace fetch("/api/...") with fetch(`/api/sites/${slug}/...`) — with or without options
  // Negative lookahead protects already-transformed URLs (/api/sites/${...})
  out = out.replace(/fetch\("\/api\/(?!sites\/\$\{)([^"]+)"(\s*,?)/g, (m, p1, rest) => {
    return `fetch(\`/api/sites/\${${slugExpr}}/${p1}\`${rest}`;
  });
  out = out.replace(/fetch\(`\/api\/(?!sites\/\$\{)([^`]+)`(\s*,?)/g, (m, p1, rest) => {
    return `fetch(\`/api/sites/\${${slugExpr}}/${p1}\`${rest}`;
  });
  // Replace router.push("/...")
  out = out.replace(/router\.push\("(\/[^"]*)"\)/g, (m, p1) => {
    if (p1.startsWith("/api")) return m;
    return `router.push(\`/sites/\${${slugExpr}}${p1}\`)`;
  });
  out = out.replace(/router\.push\(`\/([^`]*)`\)/g, (m, p1) => {
    if (p1.startsWith("/api")) return m;
    return `router.push(\`/sites/\${${slugExpr}}/${p1}\`)`;
  });
  // Named export component -> props slug
  out = out.replace(/export default function (\w+)\(\)/, (m, name) => {
    return `export default function ${name}({ slug }: { slug: string })`;
  });
  return out;
}

function generatePage(page) {
  const { src, name, label } = page;
  const fullSrc = join(ROOT, src);
  if (!existsSync(fullSrc)) {
    console.log(`SKIP ${name}: source not found`);
    return;
  }
  const content = readFileSync(fullSrc, "utf8");
  const destDir = join(ROOT, "src/app/sites/[slug]/(portal)", name);
  mkdirSync(destDir, { recursive: true });

  // Client component
  const clientName = `Portal${label}`;
  const clientPath = join(destDir, `${clientName}.tsx`);
  const transformed = transformContent(content, "slug", name);
  writeFileSync(clientPath, transformed);
  console.log(`WROTE ${clientPath} (${transformed.length} bytes)`);

  // Server wrapper page
  const pagePath = join(destDir, "page.tsx");
  const pageContent = `import { notFound } from "next/navigation";
import { initDb } from "@/lib/db";
import { loadPublicSite, publicSiteData } from "@/lib/reseller-sites";
import ${clientName} from "./${clientName}";

type Props = { params: Promise<{ slug: string }> };

export default async function Reseller${label}Page({ params }: Props) {
  const { slug } = await params;
  await initDb();
  const loaded = await loadPublicSite(slug);
  if (!loaded.site) notFound();
  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://zero-lake.vercel.app";
  const site = publicSiteData(loaded.site, origin, loaded.expired);
  const siteName = (site.theme as { siteName?: string }).siteName || site.displayName;
  return <${clientName} slug={slug} />;
}
`;
  writeFileSync(pagePath, pageContent);
  console.log(`WROTE ${pagePath}`);
}

for (const page of MAIN_PAGES) {
  generatePage(page);
}
console.log("DONE");