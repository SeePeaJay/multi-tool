import { Routes, Route, MemoryRouter } from "react-router-dom";
import Navbar from "../components/Navbar";
import { AuthProvider } from "../contexts/AuthContext";
import { LoadingProvider } from "../contexts/LoadingContext";
import { SessionProvider } from "../contexts/SessionContext";
import { StatelessMessengerProvider } from "../contexts/StatelessMessengerContext";
import { db } from "../db";
import Note from "./Note";
import Notes from "./Notes";
import "../index.css"; // include tailwind to properly set visibility of more options menu and modal

function insertNoteLink(
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
});

describe("<Note />", () => {
  it("displays, saves, and opens notelinks correctly", () => {
    insertNoteLink(1, "[[", "test");

    cy.get("p").eq(1).should("include.text", "[[test]]");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const starred = await db.notes.get("aaaaaa");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`[[${test?.id}]]`);
    });

    cy.get("span.notelink").click();

    cy.get("p").eq(1).should("have.text", "");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get({ title: "test" })).should((note) => {
      expect(note?.content).to.equal('<p class="frontmatter"></p><p></p>');
    });
  });

  it("goes back and forth between two notes correctly", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(1, "[[", "Starred");
    cy.get("span.notelink").click();

    cy.get("p").eq(1).should("contain", "test");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).should("contain", "Starred");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).should("contain", "test");
  });

  it("displays, saves, and opens blocklinks correctly", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(1, "[[", "Starred");
    cy.get("p")
      .eq(1)
      .type(
        "{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}test paragraph",
      );
    cy.get("span.notelink").click();
    cy.get("p").eq(1).click().type("{enter}");
    insertNoteLink(2, "[[", "test", "test paragraph");
    cy.get("span.notelink")
      .eq(1)
      .invoke("text") // get the text content, e.g., '[[a::b]]'
      .then((text) => {
        const match = text.match(/\[\[.*?::(.*?)\]\]/);
        if (match) {
          cy.wrap(match[1]).as("blockId"); // store 'b' as alias
        }
      });
    cy.get("span.notelink").eq(1).click();

    cy.get("@blockId").then((blockId) => {
      cy.get("span.block-id").should("have.text", `::${blockId}`);

      cy.then(() => db.notes.get({ title: "test" })).should((note) => {
        const noteLength = note!.contentWords.length;
        expect(note!.contentWords[noteLength - 1]).to.equal(`::${blockId}`);
      });

      cy.then(() => db.notes.get("aaaaaa")).should((note) => {
        const noteLength = note!.contentWords.length;
        expect(note!.contentWords[noteLength - 1]).to.include(blockId);
      });
    });
  });

  it("handles duplicated blocklinks correctly (doesn't create extra block ids to the same block)", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(1, "[[", "Starred");
    cy.get("p").eq(1).type("{enter}test paragraph");
    cy.get("span.notelink").click();
    cy.get("p").eq(1).click().type("{enter}");
    insertNoteLink(2, "[[", "test", "test paragraph");
    cy.get("p").eq(2).type("{enter}");
    insertNoteLink(3, "[[", "test", "test paragraph");
    cy.get("span.notelink").eq(1).click();

    cy.get("span.block-id").should("have.length", 1);
  });

  it("tags in frontmatter correctly (creates a backlink in the tagged note)", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(0, "#", "Starred");
    cy.get("span.tag").click();

    cy.get('div[data-type="backlink"]').should("have.length", 1);
    cy.get('div[data-type="backlink"]').should("have.text", "test");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const starred = await db.notes.get("aaaaaa");
      const test = await db.notes.get({ title: "test" });

      return { starred, test };
    }).should(({ starred, test }) => {
      expect(starred?.content).to.contain(`$ ${test?.id}`);
    });
  });

  it("removes tags in frontmatter correctly (removes backlink from previously tagged note)", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(0, "#", "Starred");
    cy.get("span.tag").click();
    cy.get("span.notelink").click();
    cy.get("p").eq(0).click().type("{backspace}{backspace}");
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
    cy.wait(1000); // wait for editor display after remount

    cy.get('div[data-type="backlink"]').should("have.length", 0);
    cy.then(() => db.notes.get("aaaaaa")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });
  });

  it("tags in block correctly (creates a backlink w/ block in the tagged note)", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(1, "#", "Starred");
    cy.get("span.tag")
      .invoke("attr", "id")
      .then((id) => {
        cy.wrap(id).as("tagId");
      });
    cy.get("span.tag").click();

    cy.get('div[data-type="backlink"]').should("have.length", 1);
    cy.get('div[data-type="backlink"]').should("include.text", "test");
    cy.get('div[data-type="backlink"]').should("include.text", "#aaaaaa");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.get("@tagId").then((tagId) => {
      cy.then(async () => {
        const starred = await db.notes.get("aaaaaa");
        const test = await db.notes.get({ title: "test" });

        return { starred, test };
      }).should(({ starred, test }) => {
        expect(starred?.content).to.contain(`$ ${test?.id}::${tagId}`);
      });
    });
  });

  it("removes tags in block correctly (removes backlink w/ block from previously tagged note)", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(1, "#", "Starred");
    cy.get("span.tag").click();
    cy.get("span.notelink").click();
    cy.get("p").eq(1).click().type("{backspace}{backspace}");
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
    cy.wait(1000); // wait for editor display after remount

    cy.get('div[data-type="backlink"]').should("have.length", 0);
    cy.then(() => db.notes.get("aaaaaa")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });
  });

  it("creates a new note by tagging correctly", () => {
    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
    insertNoteLink(0, "#", "dashboard");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails

    cy.then(() => db.notes.get({ title: "dashboard" })).should((note) => {
      expect(note?.content).to.equal('<p class="frontmatter"></p><p></p>');
    });

    cy.get("span.tag").click();

    cy.get('div[data-type="backlink"]').should("have.length", 1);
    cy.get('div[data-type="backlink"]').should("have.text", "test");
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(async () => {
      const dashboard = await db.notes.get({ title: "dashboard" });
      const test = await db.notes.get({ title: "test" });

      return { dashboard, test };
    }).should(({ dashboard, test }) => {
      expect(dashboard?.content).to.contain(`$ ${test?.id}`);
    });
  });

  it("deletes correctly (notelinks display undefined title)", () => {
    cy.mount(
      <MemoryRouter initialEntries={["/app/notes/aaaaaa"]}>
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

    insertNoteLink(1, "[[", "test");
    cy.get("span.notelink").click();
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
  });
});
