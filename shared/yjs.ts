import * as Y from "yjs";

function getDefaultYdocUpdate() {
  const yDoc = new Y.Doc();
  const yXmlFragment = yDoc.getXmlFragment("default");
  const frontmatter = new Y.XmlElement("frontmatter");
  const paragraph = new Y.XmlElement("paragraph");

  yXmlFragment.push([frontmatter, paragraph]);

  return Y.encodeStateAsUpdate(yDoc);
}

export { getDefaultYdocUpdate };
