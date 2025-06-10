import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import { AuthProvider } from "../contexts/AuthContext";
import { db } from "../db";
import { LoadingProvider } from "../contexts/LoadingContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import Editor from "./Editor";

beforeAll(async () => {
  // mock localStorage to return a valid user
  localStorage.setItem("currentUser", "test-user");

  await db.notes.put({
    id: "aaaaaa",
    title: "Starred",
    content: `<p class="frontmatter"></p><p></p>`,
    contentWords: [""],
    ydocArray: Array.from(getDefaultYdocUpdate()),
  });
});

describe("Content Editor", () => {
  it("displays and saves placeholder updates correctly", async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoadingProvider>
            <StatelessMessengerProvider>
              <Editor noteId="aaaaaa" />
            </StatelessMessengerProvider>
          </LoadingProvider>
        </AuthProvider>
      </BrowserRouter>,
    );

    const frontmatter = screen.getAllByRole("paragraph")[0];
    expect(frontmatter).toBeInTheDocument();

    await userEvent.click(frontmatter);
    await userEvent.type(frontmatter, "Hello, world!");

    await waitFor(async () => {
      // check DOM first
      expect(frontmatter).toHaveTextContent("Hello, world!");

      // then check database
      const note = await db.notes.get("aaaaaa");
      expect(note).toBeDefined();
      expect(note?.content).toContain("Hello, world!");
    });

    screen.debug();
  });
});
