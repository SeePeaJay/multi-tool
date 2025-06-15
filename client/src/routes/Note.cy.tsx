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

    cy.get("p").eq(1).click().type("[[test");
    cy.get('.suggestion-menu').should('include.text', 'test');
    cy.get("p").eq(1).click().type("{enter}");

    cy.get("p").eq(1).should("contain", "test");
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

  it("displays, saves, and opens blocklinks correctly", () => {
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
    cy.get("p")
      .eq(1)
      .click()
      .type(
        "[[Starred{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}{enter}test paragraph",
      );
    cy.get("span.notelink").click();
    cy.get("p").eq(1).click().type("{enter}[[test::test paragraph{enter}");
    cy.get("span.notelink")
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
        expect(note!.contentWords[noteLength - 1].split("::")[1]).to.equal(
          blockId,
        );
      });

      cy.then(() => db.notes.get("aaaaaa")).should((note) => {
        const noteLength = note!.contentWords.length;
        expect(note!.contentWords[noteLength - 1]).to.include(blockId);
      });
    });
  });

  it("handles duplicated blocklinks correctly (doesn't create extra block ids to the same block)", () => {
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
    cy.get("p").eq(1).click().type("[[Starred{enter}{enter}test paragraph");
    cy.get("span.notelink").click();
    cy.get("p")
      .eq(1)
      .click()
      .type(
        "{enter}[[test::test paragraph{enter}{enter}[[test::test paragraph{enter}",
      );
    cy.get("span.notelink").eq(1).click();

    cy.get("span.block-id").should("have.length", 1);
  });

  it("tags in frontmatter correctly (creates a block link in the tagged note", () => {
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
    cy.get("p").eq(0).click().type("#Starred{enter}");
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

  it("removes tags in frontmatter correctly (removes block link from previously tagged note", () => {
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
    cy.get("p").eq(0).click().type("#Starred{enter}");
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

    cy.get('div[data-type="backlink"]').should("have.length", 0);
    cy.wait(1000); // wait for db update; below is not designed to rerun when assertion fails
    cy.then(() => db.notes.get("aaaaaa")).should((note) => {
      expect(note?.content).to.not.contain(`$ `);
    });
  });

  // tag in block

  // remove tag in block

  // tag a new note

  // delete note
});
