import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./fakeApi";
import { renderApp } from "./render";

describe("dashboard", () => {
  it("shows the week's clicks and a chart with a table view", async () => {
    fakeApi();
    renderApp("/");
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    // 0 + 3 + 6 + ... + 18
    expect(screen.getByText("Clicks, last 7 days").nextSibling).toHaveTextContent("63");

    await userEvent.click(screen.getByRole("button", { name: "Show table" }));
    const table = screen.getByRole("table", { name: /Clicks per day/ });
    expect(within(table).getAllByRole("row")).toHaveLength(8);
  });

  it("reads days with the keyboard", async () => {
    fakeApi();
    renderApp("/");
    const chart = await screen.findByRole("img", { name: /Clicks per day/ });
    chart.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(await screen.findByRole("status")).toHaveTextContent("18 clicks");
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("status")).toHaveTextContent("15 clicks");
  });
});

describe("demo", () => {
  it("try the demo signs in and shows the banner", async () => {
    fakeApi({ signedIn: false });
    renderApp("/login");
    await userEvent.click(await screen.findByRole("button", { name: "Try the demo" }));
    expect(await screen.findByText(/Demo account with sample data/)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  });
});

describe("link stats", () => {
  it("period, breakdowns with country names", async () => {
    fakeApi();
    renderApp("/links");
    await userEvent.type(await screen.findByLabelText("Long address"), "https://stats.example");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));
    await userEvent.click(await screen.findByRole("link", { name: /Edit https:\/\/lp\.test\// }));

    expect(await screen.findByText("Clicks, last 30 days")).toBeInTheDocument();
    expect(screen.getByText("Iraq")).toBeInTheDocument();
    expect(screen.getByText("linkedin.com")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "7 days" }));
    expect(await screen.findByText("Clicks, last 7 days")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "7 days" })).toHaveAttribute("aria-checked", "true");
  });
});
