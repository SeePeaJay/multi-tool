import { Routes, Route, MemoryRouter } from "react-router-dom";
import * as Y from "yjs";
import Navbar from "../components/Navbar";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { SessionProvider } from "../contexts/SessionContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import { db } from "../db";
import Note from "./Note";
import Notes from "./Notes";
import "../index.css"; // include tailwind to properly set visibility of more options menu and modal

function insertNoteReference(
  pIndex: number,
  linkTrigger: string,
  linkTitle: string,
  blockText?: string,
) {
  cy.get("p").eq(pIndex).click();
  cy.get("p").eq(pIndex).type(linkTrigger);
  cy.get(".suggestion-menu").should("exist");
  cy.get("p")
    .eq(pIndex)
    .type(blockText ? `${linkTitle}::${blockText}` : linkTitle);
  cy.get(".suggestion-menu").should("include.text", blockText || linkTitle);
  cy.get("p").eq(pIndex).type("{enter}");
}

beforeEach(() => {
  cy.mount(
    <MemoryRouter initialEntries={["/app/notes/starred"]}>
      <AuthProvider>
        <LoadingProvider>
          <SessionProvider>
            <StatelessMessengerProvider>
              <Routes>
                <Route path="/app/notes/:noteId" element={<Note />} />
              </Routes>
            </StatelessMessengerProvider>
          </SessionProvider>
        </LoadingProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
});

describe("<Note />", () => {
  it("displays, saves, and opens page references correctly", () => {
    insertNoteReference(1, "[[", "test");

    cy.get("p").eq(1).should("include.text", "[[test]]");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const starred = await db.notes.get("starred");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`[[${test?.id}]]`);
    });
    cy.then(() => db.user.get(0)).should((user) => {
      expect(user).to.not.equal(undefined);

      const metadataYdocArray = user!.metadataYdocArray;
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(metadataYdocArray));
      const noteMetadata = ydoc.getMap("noteMetadata");
      const noteIsCreatedInMetadata = Array.from(
        noteMetadata.values(),
      ).includes("test");

      expect(noteIsCreatedInMetadata).to.equal(true);
    });

    cy.get("span.note-reference").click();

    cy.get("p").eq(1).should("have.text", "");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get({ title: "test" })).should((note) => {
      expect(note?.content).to.equal('<p class="frontmatter"></p><p></p>');
    });
  });

  it("goes back and forth between two notes correctly", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "[[", "Starred");
    cy.get("span.note-reference").click();

    cy.get("p").eq(1).should("contain", "test");
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).should("contain", "Starred");
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).should("contain", "test");
  });

  it("displays, saves, and opens block references correctly", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "[[", "Starred");
    cy.get("p")
      .eq(1)
      .type(
        "{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}test paragraph",
      );
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).click().type("{enter}");
    insertNoteReference(2, "[[", "test", "test paragraph");
    cy.get("span.note-reference")
      .eq(1)
      .invoke("text") // get the text content, e.g., '[[a::b]]'
      .then((text) => {
        const match = text.match(/\[\[.*?::(.*?)\]\]/);
        if (match) {
          cy.wrap(match[1]).as("blockId"); // store 'b' as alias
        }
      });
    cy.get("span.note-reference").eq(1).click();

    cy.get("@blockId").then((blockId) => {
      cy.get("span.block-id").should("have.text", `::${blockId}`);

      cy.then(() => db.notes.get({ title: "test" })).should((note) => {
        const noteLength = note!.contentWords.length;
        expect(note!.contentWords[noteLength - 1]).to.equal(`::${blockId}`);
      });

      cy.then(() => db.notes.get("starred")).should((note) => {
        const noteLength = note!.contentWords.length;
        expect(note!.contentWords[noteLength - 1]).to.include(blockId);
      });
    });
  });

  it("handles duplicated block references correctly (doesn't create extra block ids to the same block)", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "[[", "Starred");
    cy.get("p").eq(1).type("{enter}test paragraph");
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).click().type("{enter}");
    insertNoteReference(2, "[[", "test", "test paragraph");
    cy.get("p").eq(2).type("{enter}");
    insertNoteReference(3, "[[", "test", "test paragraph");
    cy.get("span.note-reference").eq(1).click();

    cy.get("span.block-id").should("have.length", 1);
  });

  it("tags in frontmatter correctly (creates a note embed in the tagged note)", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "Starred");
    cy.get("span.tag").click();

    cy.get('div[data-type="noteEmbed"]').should("have.length", 1);
    cy.get('div[data-type="noteEmbed"]').should("have.text", "test");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const starred = await db.notes.get("starred");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`$ ${test?.id}`);
    });
  });

  it("removes tags in frontmatter correctly (removes note embed from previously tagged note)", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "Starred");
    cy.get("span.tag").click();
    cy.get("span.note-reference").click();
    cy.get("p").eq(0).click().type("{backspace}{backspace}");
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <StatelessMessengerProvider>
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                </Routes>
              </StatelessMessengerProvider>
            </SessionProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    cy.wait(1000); // wait for editor display after remount

    cy.get('div[data-type="noteEmbed"]').should("have.length", 0);
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });
  });

  it("tags in block correctly (creates a note embed w/ block in the tagged note)", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "#", "Starred");
    cy.get("span.tag")
      .invoke("attr", "id")
      .then((id) => {
        cy.wrap(id).as("tagId");
      });
    cy.get("span.tag").click();

    cy.get('div[data-type="noteEmbed"]').should("have.length", 1);
    cy.get('div[data-type="noteEmbed"]').should("include.text", "test");
    cy.get('div[data-type="noteEmbed"]').should("include.text", "#starred");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.get("@tagId").then((tagId) => {
      cy.then(async () => {
        const starred = await db.notes.get("starred");
        const test = await db.notes.get({ title: "test" });

        return { starred, test };
      }).should(({ starred, test }) => {
        expect(starred?.content).to.contain(`$ ${test?.id}::${tagId}`);
      });
    });
  });

  it("removes tags in block correctly (removes note embed w/ block from previously tagged note)", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "#", "Starred");
    cy.get("span.tag").click();
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).click().type("{backspace}{backspace}");
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <StatelessMessengerProvider>
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                </Routes>
              </StatelessMessengerProvider>
            </SessionProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
    cy.wait(1000); // wait for editor display after remount

    cy.get('div[data-type="noteEmbed"]').should("have.length", 0);
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });
  });

  it("creates a new note by tagging correctly", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "dashboard");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails

    cy.then(() => db.notes.get({ title: "dashboard" })).should((note) => {
      expect(note).to.exist;
    });

    cy.get("span.tag").click();

    cy.get('div[data-type="noteEmbed"]').should("have.length", 1);
    cy.get('div[data-type="noteEmbed"]').should("have.text", "test");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const dashboard = await db.notes.get({ title: "dashboard" });
      const test = await db.notes.get({ title: "test" });

      return { dashboard, test };
    }).should(({ dashboard, test }) => {
      expect(dashboard?.content).to.contain(`$ ${test?.id}`);
    });
  });

  it("deletes correctly (note references display undefined title)", () => {
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <StatelessMessengerProvider>
                <Navbar />
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                  <Route path="/app/notes" element={<Notes />} />
                </Routes>
              </StatelessMessengerProvider>
            </SessionProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    cy.contains('div[role="button"]', "test").click();
    cy.get("ul.menu").should("not.have.class", "invisible");
    cy.contains("li", /delete/i)
      .should("be.visible")
      .click();
    cy.contains("button", /confirm/i)
      .should("be.visible")
      .click();

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.toArray()).should((notes) => {
      expect(notes.length).to.equal(1);
    });
    cy.then(() => db.user.get(0)).should((user) => {
      expect(user).to.not.equal(undefined);

      const metadataYdocArray = user!.metadataYdocArray;
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(metadataYdocArray));
      const noteMetadata = ydoc.getMap("noteMetadata");
      const noteIsDeletedFromMetadata = !Array.from(
        noteMetadata.values(),
      ).includes("test");

      expect(noteIsDeletedFromMetadata).to.equal(true);
    });
  });
});
