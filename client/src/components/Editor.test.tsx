import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import { AuthProvider } from "../contexts/AuthContext";
import { db } from "../db";
import { LoadingProvider } from "../contexts/LoadingContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import Editor from "./Editor";

beforeAll(async () => {
  // localStorage.clear();

  // mock localStorage to return a valid user
  localStorage.setItem("currentUser", "test-user");

  // await db.notes.clear();

  await db.notes.put({
    id: "aaaaaa",
    title: "Starred",
    content: `<p class="frontmatter"></p><p></p>`,
    contentWords: [""],
    ydocArray: Array.from(getDefaultYdocUpdate()),
  });
});

describe("Content Editor", () => {
  it("displays and saves frontmatter updates correctly", async () => {
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
    await userEvent.type(frontmatter, "This is frontmatter.");
    // await userEvent.type(frontmatter, "{backspace}");

    // await waitFor(async () => {
    //   // check DOM first
    //   expect(frontmatter).toHaveTextContent("T");

    //   // then check database
    //   const note = await db.notes.get("aaaaaa");
    //   expect(note).toBeDefined();
    //   expect(note?.content).toContain("T");
    // });

    screen.debug();
  });

  it("displays and saves paragraph updates correctly", async () => {
    // screen.debug();

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

    // screen.debug();

    await waitFor(async () => {
      screen.debug();

      const paragraph = screen.getAllByRole("paragraph")[1];
      expect(paragraph).toBeInTheDocument();

      await userEvent.click(paragraph);
      await userEvent.type(paragraph, "This is a paragraph.");
    }); 

    await waitFor(async () => {
      const paragraph = screen.getAllByRole("paragraph")[1];
      expect(paragraph).toHaveTextContent("This is a para");

      const note = await db.notes.get("aaaaaa");
      expect(note).toBeDefined();
      expect(note?.content).toContain("This is a para");
      console.log(note?.content);
    });

    screen.debug();
  });

  // heading

  // code block

  // notelink

  // swap back and forth

  // new blocklink (how to test jump to block?)

  // again blocklink

  // tag in frontmatter

  // remove tag in frontmatter (how do you go back though?)

  // tag in block

  // remove tag in block

  // tag a new note

  // rename note

  // delete note
});

afterEach(() => {
  cleanup();
  // localStorage.clear();
});
