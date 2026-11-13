export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Link {
  id: string;
  code: string;
  shortUrl: string;
  url: string;
  title: string;
  disabled: boolean;
  expiresAt: string | null;
  clicks: number;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewLink {
  url: string;
  alias?: string;
  title?: string;
  expiresAt?: string | null;
}

export type LinkChanges = Partial<Pick<Link, "url" | "title" | "disabled" | "expiresAt">>;
