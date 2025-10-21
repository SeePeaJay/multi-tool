import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { SessionProvider } from "../contexts/SessionContext";
import { CollabResourcesProvider } from "../contexts/CollabResourcesContext";
import { db } from "../db";
import Editor from "./Editor";

beforeEach(() => {
  cy.mount(
    <MemoryRouter initialEntries={["/app/notes/starred"]}>
      <AuthProvider>
        <LoadingProvider>
          <SessionProvider>
            <CollabResourcesProvider>
              <Editor noteId="starred" />
            </CollabResourcesProvider>
          </SessionProvider>
        </LoadingProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
});

describe("<ContentEditor />", () => {
  it("displays and saves frontmatter updates correctly", () => {
    cy.get("p.frontmatter").click().type("This is frontmatter.");

    cy.get("p.frontmatter").should("contain", "This is frontmatter.");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.contain("This is frontmatter."); // if this assertion fails, Cypress will automatically retry the whole statement until it passes, ensuring the database update from editor is detected.
    });
  });

  it("displays and saves paragraph updates correctly", () => {
    cy.get("p").eq(1).click().type("This is a paragraph.");

    cy.get("p").eq(1).should("contain", "This is a paragraph.");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.contain("This is a paragraph.");
    });
  });

  it("displays and saves heading updates correctly", () => {
    cy.get("p")
      .eq(1)
      .click()
      .type(
        "# This is a level 1 heading.{enter}## This is a level 2 heading.{enter}### This is a level 3 heading.",
      );

    cy.get("h1").eq(1).should("contain", "This is a level 1 heading.");
    cy.get("h2").should("contain", "This is a level 2 heading.");
    cy.get("h3").should("contain", "This is a level 3 heading.");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.contain("This is a level 1 heading.");
      expect(note?.content).to.contain("This is a level 2 heading.");
      expect(note?.content).to.contain("This is a level 3 heading.");
    });
  });

  it("displays and saves code block updates correctly", () => {
    cy.get("p").eq(1).click().type("``` This is a code block.");

    cy.get("code").should("contain", "This is a code block.");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.contain("This is a code block.");
    });
  });
});
