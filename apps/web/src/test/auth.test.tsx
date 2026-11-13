import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fakeApi } from "./fakeApi";
import { renderApp } from "./render";

describe("signing in", () => {
  it("signed-out visitors are sent to sign in, then back where they were going", async () => {
    fakeApi({ signedIn: false });
    const { router } = renderApp("/links/id-abc");
    expect(await screen.findByRole("heading", { name: "Sign in to LinkPulse" })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Email"), "sara@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "correct horse");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("link", { name: /All links/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/links/id-abc");
  });

  it("a wrong password shows the server's message", async () => {
    fakeApi({ signedIn: false });
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "sara@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "nope");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
  });

  it("sign out goes back to sign in", async () => {
    fakeApi();
    renderApp("/");
    await userEvent.click(await screen.findByRole("button", { name: /Sign out/ }));
    expect(await screen.findByRole("heading", { name: "Sign in to LinkPulse" })).toBeInTheDocument();
  });
});
