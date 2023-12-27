before(() => {
  cy.loginByGoogleApi();

  /* Cleanup Starred */
  cy.visit("/engrams");
  cy.contains("a", "Starred").click();
  cy.get("#blocks-editor .tiptap").type("{selectall}{backspace}"); // this ensures the tiptap editor itself is clicked on, and not some random engram link button
  cy.wait(2000); // >= debounce timer
  cy.reload();

  /* Cleanup rest */
  cy.visit("/engrams");
  cy.wait(2000);
  cy.get("a").then(($a) => {
    if ($a.text().includes("Keypoints")) {
      cy.contains("a", "Keypoints").click();
      cy.get("#more-options").click();
      cy.contains("Delete").click();
      cy.contains("Confirm").click();
      cy.contains("a", "Keypoints").should("not.exist");
    }
    if ($a.text().includes("UBC")) {
      cy.contains("a", "UBC").click();
      cy.get("#more-options").click();
      cy.contains("Delete").click();
      cy.contains("Confirm").click();
      cy.contains("a", "UBC").should("not.exist");
    }
    if ($a.text().includes("CPSC 404")) {
      cy.contains("a", "CPSC 404").click();
      cy.get("#more-options").click();
      cy.contains("Delete").click();
      cy.contains("Confirm").click();
      cy.contains("a", "CPSC 404").should("not.exist");
    }
  });
});

describe("Engram Test - Basic Edits", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("updates a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();
    cy.get("#blocks-editor .tiptap").type("Block 1");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.text", "Block 1");
  });

  it("creates a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();
    cy.get("#blocks-editor .tiptap").type("{enter}Block 2");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 2);
  });

  it("inserts (updates then creates) a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();
    cy.get("#blocks-editor p").first().type("{leftArrow}{enter}");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 3);
  });

  it("deletes a block", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();
    cy.get("#blocks-editor p").eq(1).type("{backspace}{backspace}");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("p").should("have.length", 2);
  });

  it("creates an engram (link) to go to", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred").click();
    cy.get("#blocks-editor p").first().type(" for *CPSC 404{}");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.visit("/engrams");
    cy.contains("a", "CPSC 404");
  });
});

describe("Engram Test - Block References", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("adds a tag in blocks, which triggers addition of a block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#blocks-editor .tiptap").type("This is a very important keypoint. #Keypoint{}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "Keypoint").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("adds a duplicate tag in blocks, and should not add another block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#blocks-editor .tiptap").type(" #Keypoint{}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "Keypoint").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("removes a duplicate tag in blocks, and should not remove a block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#blocks-editor .tiptap").type("{backspace}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "Keypoint").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("removes a tag in blocks, which triggers deletion of a block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#blocks-editor .tiptap").type("{backspace}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "Keypoint").click();

    cy.get("#blocks-editor").find("p").should("have.length", 1);
    cy.get("#blocks-editor").find("button").should("have.length", 0);
  });

  it("adds a tag in title, which triggers addition of a block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#title-editor .tiptap").type(" #UBC{}");
    cy.get("#blocks-editor").click(); // to trigger blur
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("adds a duplicate tag in title, and should not add another block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#title-editor .tiptap").type(" #UBC{}");
    cy.get("#blocks-editor").click(); // to trigger blur
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("removes a duplicate tag in title, and should not delete another block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#title-editor .tiptap").type("{backspace}{backspace}{enter}");
    cy.get("#blocks-editor").click(); // to trigger blur
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();

    cy.get("#blocks-editor").find("p").should("have.length", 2);
    cy.get("#blocks-editor").find("button").should("have.length", 1);
  });

  it("removes a tag in title, which leads to deletion of a block backlink", () => {
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();
    cy.get("#title-editor .tiptap").type("{backspace}{backspace}{enter}");
    cy.get("#blocks-editor").click(); // to trigger blur
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();

    cy.get("#blocks-editor").find("p").should("have.length", 1);
    cy.get("#blocks-editor").find("button").should("have.length", 0);
  });

  it("adds a title block link, which triggers addition of tag in title", () => {
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();
    cy.get("#blocks-editor .tiptap").type("*CPSC 404{}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.get("#blocks-editor").contains("CPSC 404").click();

    cy.get("#title-editor").find("h1").contains("CPSC 404");
    cy.get("#title-editor").find("h1").contains("#UBC");
    cy.get("#blocks-editor").find("p").should("have.length", 1);
  });

  it("removes a title block link, which should remove tag in title", () => {
    cy.visit("/engrams");
    cy.contains("a", "UBC").click();
    cy.get("#blocks-editor .tiptap").type("{backspace}");
    cy.wait(2000); // >= debounce timer
    cy.reload();
    cy.visit("/engrams");
    cy.contains("a", "CPSC 404").click();

    cy.get("#title-editor").find("h1").contains("CPSC 404");
    cy.get("#title-editor").find("h1").should("not.contain", "#UBC");
  });

  // it("removes an anchor block link, which should remove a tag in block", () => {
  //   cy.visit("/engrams");
  //   cy.contains("a", "CPSC 404").click();
  //   cy.get("#blocks-editor").type(" #Keypoint{}");
  //   cy.wait(2000); // >= debounce timer
  //   cy.reload();
  //   cy.get("#blocks-editor").contains("Keypoint").click();
  //   cy.get("#title-editor").find("h1").contains("Keypoint");
  //   cy.get("#blocks-editor").find("button").should("have.length", 1);
  //
  //   cy.get("#blocks-editor [contenteditable]").first().click("right").type("{backspace}");
  //   cy.wait(2000); // >= debounce timer
  //   cy.reload();
  //   cy.visit("/engrams");
  //   cy.contains("a", "CPSC 404").click();
  //   cy.get("#title-editor").find("h1").contains("CPSC 404");
  //   cy.get("#blocks-editor").should("not.contain", "#Keypoint");
  // });
});

describe("Engram Test - Rename", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("renames an engram", () => {
    cy.visit("/engrams");
    cy.contains("a", "Keypoint").click();
    cy.get("#title-editor .tiptap").type("s{enter}");
    cy.wait(2000); // >= debounce timer
    cy.reload();

    cy.get("#title-editor").find("h1").contains("Keypoints");

    cy.visit("/engrams");
    cy.contains("a", "Keypoint").should("not.exist");
  });
});

describe("Engram Test - Delete", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("deletes engrams", () => {
    cy.visit("/engrams");

    // need to check block refs
  });
});
