import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./fakeApi";
import { renderApp } from "./render";

describe("links page", () => {
  it("starts empty with a hint", async () => {
    fakeApi();
    renderApp("/");
    expect(await screen.findByText(/No links yet/)).toBeInTheDocument();
  });

  it("shortens a link and lists it", async () => {
    const { calls } = fakeApi();
    renderApp("/");
    await userEvent.type(await screen.findByLabelText("Long address"), "https://example.com/very/long");
    await userEvent.click(screen.getByRole("button", { name: "+ Custom name and title" }));
    await userEvent.type(screen.getByLabelText("Custom name (optional)"), "my-cv");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));

    expect(await screen.findByRole("status")).toHaveTextContent("https://lp.test/my-cv");
    const list = await screen.findByRole("list", { name: "Links" });
    expect(within(list).getByText("https://example.com/very/long")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST" && c.path === "/links")?.body).toEqual({
      url: "https://example.com/very/long",
      alias: "my-cv",
    });
  });

  it("shows the API's message for a bad address", async () => {
    fakeApi();
    renderApp("/");
    await userEvent.type(await screen.findByLabelText("Long address"), "example.com");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("use a full address");
  });

  it("asks before deleting, then removes the link", async () => {
    const { links } = fakeApi();
    renderApp("/");
    await userEvent.type(await screen.findByLabelText("Long address"), "https://delete.example");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));
    const deleteButton = await screen.findByRole("button", { name: /Delete https:\/\/lp\.test\// });

    await userEvent.click(deleteButton);
    expect(await screen.findByRole("heading", { name: "Delete this link?" })).toBeInTheDocument();
    expect(links).toHaveLength(1); // nothing deleted yet

    await userEvent.click(screen.getByRole("button", { name: "Delete link" }));
    await waitFor(() => expect(links).toHaveLength(0));
    expect(await screen.findByText(/No links yet/)).toBeInTheDocument();
  });

  it("search goes into the address and filters", async () => {
    fakeApi();
    const { router } = renderApp("/");
    await userEvent.type(await screen.findByLabelText("Long address"), "https://react.dev");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));
    await screen.findByText("https://react.dev");

    await userEvent.type(screen.getByRole("searchbox", { name: "Search links" }), "vue");
    expect(await screen.findByText(/No links match “vue”/)).toBeInTheDocument();
    expect(router.state.location.search).toBe("?q=vue");
  });
});

describe("link page", () => {
  it("edits the address and turns the link off", async () => {
    const { links } = fakeApi();
    renderApp("/");
    await userEvent.type(await screen.findByLabelText("Long address"), "https://old.example");
    await userEvent.click(screen.getByRole("button", { name: "Shorten" }));
    await userEvent.click(await screen.findByRole("link", { name: /Edit https:\/\/lp\.test\// }));

    const address = await screen.findByLabelText("Goes to");
    await userEvent.clear(address);
    await userEvent.type(address, "https://new.example");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Saved/)).toBeInTheDocument();
    expect(links[0]?.url).toBe("https://new.example");

    await userEvent.click(screen.getByRole("button", { name: "Turn off" }));
    expect(await screen.findByText(/This link is off/)).toBeInTheDocument();
    expect(links[0]?.disabled).toBe(true);
  });
});
