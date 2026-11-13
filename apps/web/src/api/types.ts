export interface User {
  id: string;
  email: string;
  name: string;
  isDemo: boolean;
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

export interface DayCount {
  date: string;
  clicks: number;
}

export interface Count {
  label: string;
  clicks: number;
}

export interface Overview {
  links: number;
  clicks: number;
  last7Days: DayCount[];
  topLinks: { id: string; code: string; title: string; url: string; clicks: number }[];
}

export interface LinkStats {
  total: number;
  inPeriod: number;
  byDay: DayCount[];
  referrers: Count[];
  devices: Count[];
  browsers: Count[];
  countries: Count[];
}
