import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./client";
import type { Link, LinkChanges, LinkStats, NewLink, Overview, Page, User } from "./types";

export const keys = {
  me: ["me"] as const,
  links: ["links"] as const,
  linkList: (search: string, page: number) => ["links", "list", search, page] as const,
  link: (id: string) => ["links", id] as const,
  overview: ["links", "overview"] as const,
  stats: (id: string, days: number) => ["links", id, "stats", days] as const,
};

// null when signed out
export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api<User>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useSignIn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => api<User>("/auth/login", { method: "POST", body }),
    onSuccess: (user) => client.setQueryData(keys.me, user),
  });
}

export function useSignUp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string; password: string }) =>
      api<User>("/auth/signup", { method: "POST", body }),
    onSuccess: (user) => client.setQueryData(keys.me, user),
  });
}

export function useDemo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<User>("/auth/demo", { method: "POST" }),
    onSuccess: (user) => {
      client.clear();
      client.setQueryData(keys.me, user);
    },
  });
}

export function useSignOut() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      client.clear();
      client.setQueryData(keys.me, null);
    },
  });
}

export const PAGE_SIZE = 10;

export function useLinks(search: string, page: number) {
  return useQuery({
    queryKey: keys.linkList(search, page),
    queryFn: () =>
      api<Page<Link>>(`/links?${new URLSearchParams({ search, page: String(page), pageSize: String(PAGE_SIZE) })}`),
    placeholderData: keepPreviousData,
  });
}

export function useLink(id: string) {
  return useQuery({ queryKey: keys.link(id), queryFn: () => api<Link>(`/links/${id}`) });
}

export function useCreateLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: NewLink) => api<Link>("/links", { method: "POST", body }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.links }),
  });
}

export function useUpdateLink(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: LinkChanges) => api<Link>(`/links/${id}`, { method: "PATCH", body }),
    onSuccess: (link) => {
      client.setQueryData(keys.link(id), link);
      return client.invalidateQueries({ queryKey: keys.links });
    },
  });
}

export function useDeleteLink() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/links/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.links }),
  });
}

export function useOverview() {
  return useQuery({ queryKey: keys.overview, queryFn: () => api<Overview>("/stats/overview") });
}

export function useLinkStats(id: string, days: number) {
  return useQuery({
    queryKey: keys.stats(id, days),
    queryFn: () => api<LinkStats>(`/stats/links/${id}?days=${days}`),
    placeholderData: keepPreviousData,
  });
}
