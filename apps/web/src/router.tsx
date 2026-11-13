import type { RouteObject } from "react-router";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import { DashboardPage } from "./pages/DashboardPage";
import { LinkPage } from "./pages/LinkPage";
import { LinksPage } from "./pages/LinksPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/links", element: <LinksPage /> },
      { path: "/links/:id", element: <LinkPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
];
