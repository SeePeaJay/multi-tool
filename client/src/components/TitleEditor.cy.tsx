import { MemoryRouter } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import { db } from "../db";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import Editor from "./Editor";

before(() => {
  cy.then(() =>
    db.notes.put({
      id: "bbbbbb",
      title: "test",
      content: `<p class="frontmatter"></p><p></p>`,
      contentWords: [""],
      ydocArray: Array.from(getDefaultYdocUpdate()),
    }),
  );
});

it("renames correctly", () => {
  cy.mount(
    <MemoryRouter initialEntries={["/app/notes/bbbbbb"]}>
      <AuthProvider>
        <LoadingProvider>
          <StatelessMessengerProvider>
            <Editor noteId="bbbbbb" />
          </StatelessMessengerProvider>
        </LoadingProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

  cy.get("h1").click().type("ing{enter}");

  cy.get("h1").should("have.text", "testing");
  cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
  cy.then(() => db.notes.get({ title: "testing" })).should((note) => {
    expect(note?.title).to.contain("testing");
  });
});
