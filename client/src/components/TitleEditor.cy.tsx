import { MemoryRouter } from "react-router-dom";
import * as Y from "yjs";
import { db, dbCreateNote } from "../db";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { SessionProvider } from "../contexts/SessionContext";
import { CollabResourcesProvider } from "../contexts/CollabResourcesContext";
import TitleEditor from "./TitleEditor";

it("renames correctly", () => {
  cy.then(() => dbCreateNote({ id: "bbbbbb", title: "test" }));

  cy.mount(
    <MemoryRouter initialEntries={["/app/notes/bbbbbb"]}>
      <AuthProvider>
        <LoadingProvider>
          <SessionProvider>
            <CollabResourcesProvider>
              <TitleEditor noteId="bbbbbb" />
            </CollabResourcesProvider>
          </SessionProvider>
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
  cy.then(() => db.user.get(0)).should((user) => {
    expect(user).to.not.equal(undefined);

    const metadataYdocArray = user!.metadataYdocArray;
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(metadataYdocArray));
    const noteMetadata = ydoc.getMap("noteMetadata");
    const noteIsRenamedInMetadata =
      Array.from(noteMetadata.values()).includes("testing") &&
      !Array.from(noteMetadata.values()).includes("test");

    expect(noteIsRenamedInMetadata).to.equal(true);
  });
});
