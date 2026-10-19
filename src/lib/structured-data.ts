/**
 * Structured data (schema.org JSON-LD), built as plain objects and rendered by JsonLd.astro.
 * Pure: no Astro, no DOM. Every URL is absolute (resolved against the site origin).
 *
 * What we describe, and what we deliberately leave out:
 * - Home: Organization + WebSite. No SearchAction (the site has no search).
 * - Tool pages: WebApplication + BreadcrumbList.
 * - Never aggregateRating or review: we have none, and inventing them is spam.
 * - No FAQPage: Google shows it only for government and health sites.
 */
import type { Category } from "../tools/types";

type Node = Record<string, unknown>;

/** schema.org applicationCategory per tool category (values from Google's software app list). */
const APPLICATION_CATEGORY: Record<Category, string> = {
  image: "MultimediaApplication",
  pdf: "UtilitiesApplication",
  document: "BusinessApplication",
  audio: "MultimediaApplication",
};

/** What a browser needs to run any tool here. Pages pass the translated sentence (schema.browserRequirements). */
export const BROWSER_REQUIREMENTS = "Requires JavaScript and WebAssembly in a current browser.";

const abs = (site: URL | string, path: string): string => new URL(path, site).href;
const orgId = (site: URL | string): string => abs(site, "/#organization");
const websiteId = (site: URL | string): string => abs(site, "/#website");

export interface OrganizationInput {
  site: URL | string;
  name: string;
  /** Site-relative path of a square logo, e.g. "/icon-512.png". */
  logoPath: string;
  sameAs: string[];
}

export function organization({ site, name, logoPath, sameAs }: OrganizationInput): Node {
  return {
    "@type": "Organization",
    "@id": orgId(site),
    name,
    url: abs(site, "/"),
    logo: abs(site, logoPath),
    sameAs,
  };
}

export interface WebSiteInput {
  site: URL | string;
  name: string;
  description: string;
  inLanguage: string;
}

export function website({ site, name, description, inLanguage }: WebSiteInput): Node {
  return {
    "@type": "WebSite",
    "@id": websiteId(site),
    name,
    url: abs(site, "/"),
    description,
    inLanguage,
    publisher: { "@id": orgId(site) },
  };
}

export interface WebApplicationInput {
  site: URL | string;
  /** The page's H1. */
  name: string;
  description: string;
  /** Site-relative path of the page, e.g. "/compress-image/". */
  path: string;
  category: Category;
  inLanguage: string;
  /** Site-relative path of the page's Open Graph image. */
  imagePath?: string;
  publisherName: string;
  /** Defaults to the English BROWSER_REQUIREMENTS. */
  browserRequirements?: string;
}

export function webApplication(input: WebApplicationInput): Node {
  const { site, name, description, path, category, inLanguage, imagePath, publisherName, browserRequirements = BROWSER_REQUIREMENTS } = input;
  return {
    "@type": "WebApplication",
    name,
    description,
    url: abs(site, path),
    ...(imagePath ? { image: abs(site, imagePath) } : {}),
    inLanguage,
    applicationCategory: APPLICATION_CATEGORY[category],
    operatingSystem: "Any",
    browserRequirements,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@type": "Organization", "@id": orgId(site), name: publisherName, url: abs(site, "/") },
  };
}

export interface Crumb {
  name: string;
  /** Site-relative path. */
  path: string;
}

export function breadcrumbs(site: URL | string, crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: abs(site, crumb.path),
    })),
  };
}

/** One JSON-LD document holding several nodes. */
export const graph = (nodes: Node[]): Node => ({ "@context": "https://schema.org", "@graph": nodes });

/**
 * JSON for a <script type="application/ld+json"> data block. "<" is escaped so no string can close
 * the script element ("</script>") or open a comment; ">", "&" and the JS line separators likewise.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replaceAll(String.fromCharCode(0x2028), "\\u2028")
    .replaceAll(String.fromCharCode(0x2029), "\\u2029");
}
