import { nanoid } from "nanoid";
import { Routes, Route, MemoryRouter } from "react-router-dom";
import * as Y from "yjs";
import Navbar from "../components/Navbar";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { SessionProvider } from "../contexts/SessionContext";
import { CollabResourcesProvider } from "../contexts/CollabResourcesContext";
import { setupYdoc } from "../utils/yjs";
import { db, dbCreateNote } from "../db";
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

const appComponent = (
  <MemoryRouter initialEntries={["/app/notes/starred"]}>
    <AuthProvider>
      <LoadingProvider>
        <SessionProvider>
          <CollabResourcesProvider>
            <Routes>
              <Route path="/app/notes/:noteId" element={<Note />} />
            </Routes>
          </CollabResourcesProvider>
        </SessionProvider>
      </LoadingProvider>
    </AuthProvider>
  </MemoryRouter>
);

describe("<Note />", () => {
  beforeEach(() => {
    cy.mount(appComponent);
  });

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

  it("deletes correctly (note references display undefined title)", () => {
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <CollabResourcesProvider>
                <Navbar />
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                  <Route path="/app/notes" element={<Notes />} />
                </Routes>
              </CollabResourcesProvider>
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

describe("Sync note embeds with tags tests 1", () => {
  // Tag `Starred` in `test` for below test case
  beforeEach(() => {
    cy.then(() => dbCreateNote({ id: "aaaaaa", title: "test" }))
      .then(async () => {
        const ydoc = new Y.Doc();
        await setupYdoc({ noteId: "aaaaaa", ydoc });

        const frontmatter = ydoc
          .getXmlFragment("default")
          .toArray()[0] as Y.XmlElement;

        const tag = new Y.XmlElement("tag");
        tag.setAttribute("targetNoteId", "starred");
        tag.setAttribute("id", nanoid(6));

        frontmatter.push([tag]);
      })
      .then(() => {
        cy.mount(appComponent);
      });
  });

  it("inserts note embed correctly on first visit (repairs correctly)", () => {
    cy.get('div.note-embed').should("have.length", 1);
    cy.then(async () => {
      const starred = await db.notes.get("starred");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`$ ${test?.id}`);
    });
  });
});

describe("Sync note embeds with tags tests 2", () => {
  beforeEach(() => {
    cy.mount(appComponent);
  });

  it("inserts page embed correctly after user inserts corresponding tag in frontmatter", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "Starred");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const starred = await db.notes.get("starred");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`$ ${test?.id}`);
    });

    cy.get("span.tag").click();

    cy.get('div.note-embed').should("have.length", 1);
    cy.get('div.note-embed').should("have.text", "test");
  });

  it("removes page embed correctly after user removes corresponding tag in frontmatter", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "Starred");
    cy.get("p").eq(0).click().type("{backspace}{backspace}");

    cy.wait(1000);
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });

    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <CollabResourcesProvider>
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                </Routes>
              </CollabResourcesProvider>
            </SessionProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    cy.wait(1000); // wait for editor display after remount
    cy.get('div.note-embed').should("have.length", 0);
  });

  it("inserts block embed correctly after user inserts corresponding tag in block", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "#", "Starred");

    cy.get("span.tag")
      .invoke("attr", "id")
      .then((id) => {
        cy.wrap(id).as("tagId");
      });
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

    cy.get("span.tag").click();

    cy.get('div.note-embed').should("have.length", 1);
    cy.get('div.note-embed').should("include.text", "test");
    cy.get('div.note-embed').should("include.text", "#starred");
  });

  it("removes block embed correctly after user removes corresponding tag in block", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "#", "Starred");
    cy.get("p").eq(1).click().type("{backspace}{backspace}");

    cy.wait(1000);
    cy.then(() => db.notes.get("starred")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });

    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/starred"]}>
        <AuthProvider>
          <LoadingProvider>
            <SessionProvider>
              <CollabResourcesProvider>
                <Routes>
                  <Route path="/app/notes/:noteId" element={<Note />} />
                </Routes>
              </CollabResourcesProvider>
            </SessionProvider>
          </LoadingProvider>
        </AuthProvider>
      </MemoryRouter>,
    );

    cy.wait(1000); // wait for editor display after remount
    cy.get('div.note-embed').should("have.length", 0);
  });

  it("creates a new note correctly by tagging", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "dashboard");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const dashboard = await db.notes.get({ title: "dashboard" });
      const test = await db.notes.get({ title: "test" });

      return { dashboard, test };
    }).should(({ dashboard, test }) => {
      expect(dashboard?.content).to.contain(`$ ${test?.id}`);
    });

    cy.get("span.tag").click();

    cy.get('div.note-embed').should("have.length", 1);
    cy.get('div.note-embed').should("have.text", "test");
  });
});

describe("Sync tags with note embeds tests", () => {
  beforeEach(() => {
    cy.mount(appComponent);
  });

  it("inserts frontmatter tag correctly after user inserts corresponding page embed", () => {
    insertNoteReference(1, "[[ ", "test");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get({ title: "test" })).should((test) => {
      expect(test?.content).to.contain(`#starred`);
    });

    cy.get('div.note-embed').click("left");

    cy.get("span.tag").should("have.text", "#Starred");
  });

  it("removes frontmatter tag correctly after user removes corresponding page embed", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("p").eq(1).type("{enter}");
    insertNoteReference(2, "[[ ", "test");
    cy.get("p").eq(2).type("{del}{del}");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get({ title: "test" })).should((test) => {
      expect(test?.content).to.not.contain(`#starred`);
    });

    cy.get("span.note-reference").click();

    cy.get("span.tag").should("have.length", 0);
  });

  it("removes multiple copies of the same tag correctly after user removes corresponding page embed", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(0, "#", "Starred");
    insertNoteReference(0, "#", "Starred");
    cy.get("span.tag").eq(0).click();
    cy.get("p").eq(1).click();
    cy.get("p").eq(1).type("{del}");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get({ title: "test" })).should((test) => {
      expect(test?.content).to.not.contain(`#starred`);
    });

    cy.get("span.note-reference").click();

    cy.get("span.tag").should("have.length", 0);
  });

  it("inserts tag in block correctly after user inserts corresponding block embed", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "[[", "Starred");
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).type("{enter}");
    insertNoteReference(2, "[[ ", "test", "[[starred]]");
    cy.get("a.block-embed")
      .invoke("attr", "href")
      .then((href) => {
        const [, tagId] = href!.split("#");
        cy.wrap(tagId).as("tagId");
      });

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.get<string>("@tagId").then((tagId) => {
      cy.then(() => db.notes.get({ title: "test" })).should((test) => {
        const doc = new DOMParser().parseFromString(test!.content, "text/html");
        const tagExists =
          doc.querySelector(`span.tag#${CSS.escape(tagId)}`) !== null;

        expect(tagExists).to.be.true;
      });
    });

    cy.get("a.block-embed").click();
    cy.get<string>("@tagId").then((tagId) => {
      cy.get(`span.tag#${CSS.escape(tagId)}`).should("have.text", "#Starred");
    });
  });

  it("removes tag in block correctly (converted to block id) after user removes corresponding block embed", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "[[", "Starred");
    cy.get("span.note-reference").click();
    cy.get("p").eq(1).type("{enter}");
    insertNoteReference(2, "[[ ", "test", "[[starred]]");
    cy.get("a.block-embed")
      .invoke("attr", "href")
      .then((href) => {
        const [, tagId] = href!.split("#");
        cy.wrap(tagId).as("tagId");
      });
    cy.get("p").eq(2).type("{del}{del}");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.get<string>("@tagId").then((tagId) => {
      cy.then(() => db.notes.get({ title: "test" })).should((test) => {
        const doc = new DOMParser().parseFromString(test!.content, "text/html");
        const tagExists =
          doc.querySelector(`span.tag#${CSS.escape(tagId)}`) !== null;
        const blockIdExists =
          doc.querySelector(`span.block-id#${CSS.escape(tagId)}`) !== null;

        expect(tagExists).to.be.false;
        expect(blockIdExists).to.be.true;
      });
    });

    cy.get("span.note-reference").click();

    cy.get("span.tag").should("have.length", 0);
    cy.get<string>("@tagId").then((tagId) => {
      cy.get("span.block-id").should("have.text", `::${tagId}`);
    });
  });

  it("converts block id back to tag correctly after user cut and pasted corresponding block embed", () => {
    insertNoteReference(1, "[[", "test");
    cy.get("span.note-reference").click();
    insertNoteReference(1, "#", "Starred");
    cy.get("span.tag")
      .invoke("attr", "id")
      .then((id) => {
        cy.wrap(id).as("tagId");
      });
    cy.get("span.tag").click();
    cy.get("p").eq(1).type("{cmd}a{backspace}"); // can't really cut and paste in Cypress but this should do
    cy.wait(1000); // wait for db update
    cy.get("p").eq(1).type("{cmd}z");

    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.get<string>("@tagId").then((tagId) => {
      cy.then(() => db.notes.get({ title: "test" })).should((test) => {
        const doc = new DOMParser().parseFromString(test!.content, "text/html");
        const tagExists =
          doc.querySelector(`span.tag#${CSS.escape(tagId)}`) !== null;
        const blockIdExists =
          doc.querySelector(`span.block-id#${CSS.escape(tagId)}`) !== null;

        expect(tagExists).to.be.true;
        expect(blockIdExists).to.be.false;
      });
    });

    cy.get("span.note-reference").click();

    cy.get("span.block-id").should("have.length", 0);
    cy.get("@tagId").then((tagId) => {
      cy.get(`span.tag#${tagId}`).should("have.text", "#Starred");
    });
  });
});
