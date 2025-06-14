import { Routes, Route, MemoryRouter } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import { db } from "../db";
import Note from "./Note";

// setup storage before each test; cypress clears browser storage after each test by default
beforeEach(async () => {
  localStorage.setItem("currentUser", "test-user"); // mock localStorage to return a valid user

  await db.notes.clear(); // clear notes in case you rerun test in test runner; data from previous attempt can linger
  await db.notes.put({
    id: "aaaaaa",
    title: "Starred",
    content: `<p class="frontmatter"></p><p></p>`,
    contentWords: [""],
    ydocArray: Array.from(getDefaultYdocUpdate()),
  });
});

describe("<Editor />", () => {
  it("displays, saves, and opens notelinks correctly", () => {
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/aaaaaa"]}>
        <AuthProvider>
          <LoadingProvider>
            <StatelessMessengerProvider>
              <Routes>
                <Route path="/app/notes/:noteId" element={<Note />} />
              </Routes>
            </StatelessMessengerProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    cy.get("p").eq(1).click().type("[[test{enter}");

    cy.get("p").eq(1).should("contain", "test");
    cy.then(async () => {
      const starred = await db.notes.get("aaaaaa");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`[[${test?.id}]]`);
    });

    cy.get("span.notelink").click();
    
    cy.get("p").eq(1).should("have.text", "");
    cy.then(async () => db.notes.get({ title: "test" })).should((note) => {
      expect(note?.content).to.equal('<p class="frontmatter"></p><p></p>');
    });
  });

  it("goes back and forth between two notes correctly", () => {
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/aaaaaa"]}>
        <AuthProvider>
          <LoadingProvider>
            <StatelessMessengerProvider>
              <Routes>
                <Route path="/app/notes/:noteId" element={<Note />} />
              </Routes>
            </StatelessMessengerProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    cy.get("p").eq(1).click().type("[[test{enter}");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).click().type("[[Starred{enter}");
    cy.get("span.notelink").click();

    cy.get("p").eq(1).should("contain", "test");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).should("contain", "Starred");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).should("contain", "test");
  });

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
