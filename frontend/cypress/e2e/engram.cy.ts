describe("Engram Test - Basic Edits", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("cleans up (temp)", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("[contenteditable]").eq(1).click();
    cy.get("[contenteditable]").eq(1).type("{selectall}{backspace}");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    // cy.get("p").should("have.text", "");
  });

  it("updates a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("[contenteditable]").eq(1).click();
    cy.get("[contenteditable]").eq(1).type("Block 1");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.text", "Block 1");
  });

  it("creates a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("[contenteditable]").eq(1).click();
    cy.get("[contenteditable]").eq(1).type("{enter}Block 2");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 2);
  });

  it("inserts (updates then creates) a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("p").first().click();
    cy.get("p").first().type("{leftArrow}{enter}");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 3);
  });

  it("deletes a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("p").eq(1).click();
    cy.get("p").eq(1).type("{backspace}{backspace}");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 2);
  });

  it("creates an engram (link) to go to", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();

    cy.get("p").first().click();
    cy.get("p").first().type(" for *CPSC 404{}");

    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.visit("/engrams");
    cy.contains("a", "CPSC 404");
  });
});

// describe("Engram Test - Block References", () => {
//   beforeEach(function () {
//     cy.loginByGoogleApi();
//   });
//
//   it("adds a tag in blocks, which triggers addition of a block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("[contenteditable]").eq(1).click();
//     cy.get("[contenteditable]").eq(1).type("This is a very important keypoint. #Keypoint{}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "Keypoint").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("adds a duplicate tag in blocks, and should not add another block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("[contenteditable]").eq(1).click();
//     cy.get("[contenteditable]").eq(1).type(" #Keypoint{}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "Keypoint").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("removes a duplicate tag in blocks, and should not remove a block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("[contenteditable]").eq(1).click("right"); // adjust accordingly; default position makes Cypress click on an engram link as of this writing
//     cy.get("[contenteditable]").eq(1).type("{backspace}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "Keypoint").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("removes a tag in blocks, which triggers deletion of a block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("[contenteditable]").eq(1).click("right");
//     cy.get("[contenteditable]").eq(1).type("{backspace}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "Keypoint").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//     cy.get("#blocks-editor").find("button").should("have.length", 0);
//   });
//
//   it("adds a tag in title, which triggers addition of a block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("#title-editor").click().type(" #UBC{}");
//     cy.get("#blocks-editor").click(); // to trigger blur
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("adds a duplicate tag in title, and should not add another block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("#title-editor").click().type(" #UBC{}");
//     cy.get("#blocks-editor").click(); // to trigger blur
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("removes a duplicate tag in title, and should not delete another block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("#title-editor [contenteditable]").first().click("right").type("{backspace}{backspace}{enter}");
//     cy.get("#blocks-editor").click(); // to trigger blur
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 2);
//     cy.get("#blocks-editor").find("button").should("have.length", 1);
//   });
//
//   it("removes a tag in title, which leads to deletion of a block backlink", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "CPSC 404").click();
//
//     cy.get("#title-editor").click("right").type("{backspace}{enter}");
//     cy.get("#blocks-editor").click(); // to trigger blur
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//     cy.get("#blocks-editor").find("button").should("have.length", 0);
//   });
//
//   it("adds a title block link, which triggers addition of tag in title", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").type("*CPSC 404{}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.get("#blocks-editor").contains("CPSC 404").click();
//
//     cy.get("#title-editor").find("h1").contains("CPSC 404");
//     cy.get("#title-editor").find("h1").contains("#UBC");
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//   });
//
//   it("adds a duplicate title block link, which should not add a tag in title", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").click("right").type("{enter}*CPSC 404{}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.get("#blocks-editor").contains("CPSC 404").click();
//
//     cy.get("#title-editor").find("h1").contains("CPSC 404");
//     cy.get("#title-editor").find("h1").contains("#UBC");
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//   });
//
//   it("removes a duplicate title block link, which should not remove tag in title", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").click().type("{backspace}{backspace}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.get("#blocks-editor").contains("CPSC 404").click();
//
//     cy.get("#title-editor").find("h1").contains("CPSC 404");
//     cy.get("#title-editor").find("h1").contains("#UBC");
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//   });
//
//   it("removes a title block link, which should remove tag in title", () => {
//     cy.visit("/engrams");
//     cy.contains("a", "UBC").click();
//
//     cy.get("#blocks-editor").click("right").type("{backspace}{backspace}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.get("#blocks-editor").contains("CPSC 404").click();
//
//     cy.get("#title-editor").find("h1").contains("CPSC 404");
//     cy.get("#title-editor").find("h1").contains("#UBC");
//     cy.get("#blocks-editor").find("p").should("have.length", 1);
//   });
// });

// describe("Engram Test - Rename", () => {
//   beforeEach(function () {
//     cy.loginByGoogleApi();
//   });
//
//   it("visits CCC", () => {
//     cy.visit("/engrams");
//   });
//
//   it("updates a block", () => {
//     cy.visit("/engrams/Starred");
//     cy.get("p").click();
//     cy.get("p").type("Hello, World");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.contains("p", "Hello, World").should("exist");
//
//     // cy.get("p").click();
//     // cy.get("p").type("{selectall}{del}");
//   });
//
//   it("creates a link", () => {
//     cy.visit("/engrams/Starred");
//     cy.get("p").click();
//     cy.get("p").type("*CCC{}");
//
//     cy.wait(2000); // >= debounce timer
//     cy.reload();
//
//     cy.visit("/engrams");
//     cy.contains("a", "CCC");
//
//     // cy.get("p").click();
//     // cy.get("p").type("{selectall}{del}");
//   });
// });
