import { BrowserRouter } from "react-router-dom";
import { getDefaultYdocUpdate } from "shared";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import { db } from "../db";
import Editor from "./Editor";

// setup storage before each test; cypress clears browser storage after each test by default
beforeEach(async () => {
  localStorage.setItem("currentUser", "test-user"); // mock localStorage to return a valid user

  await db.notes.put({
    id: "aaaaaa",
    title: "Starred",
    content: `<p class="frontmatter"></p><p></p>`,
    contentWords: [""],
    ydocArray: Array.from(getDefaultYdocUpdate()),
  });
});

describe("<Editor />", () => {
  // it('renders', () => {
  //   // see: https://on.cypress.io/mounting-react
  //   cy.mount(<Editor />)
  // })

  it("displays and saves frontmatter updates correctly", () => {
    cy.mount(
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

    cy.get("p.frontmatter").click().type("This is frontmatter.");

    cy.get("p.frontmatter").should("contain", "This is frontmatter.");
    cy.then(() => db.notes.get("aaaaaa")).should((note) => {
      // if this assertion fails, Cypress will automatically retry the whole statement until it passes, ensuring the database update from editor is detected.
      expect(note?.content).to.contain("This is frontmatter.");
    });
  });

  it("displays and saves paragraph updates correctly", async () => {
    cy.mount(
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

    cy.get("p").eq(1).click().type("This is a paragraph.");

    cy.get("p").eq(1).should("contain", "This is a paragraph.");
    cy.then(() => db.notes.get("aaaaaa")).should((note) => {
      expect(note?.content).to.contain("This is a paragraph.");
    });
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
