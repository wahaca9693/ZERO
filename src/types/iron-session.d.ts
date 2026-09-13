import "iron-session";

declare module "iron-session" {
  interface IronSessionData {
    userId?: number;
    siteSlug?: string;
    role?: string;
  }
}

export {};