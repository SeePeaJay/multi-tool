import * as base64js from "base64-js";
import * as Y from "yjs";

function getDefaultYdocUpdate() {
  // const yDoc = new Y.Doc();
  // const yXmlFragment = yDoc.getXmlFragment("default");
  // const frontmatter = new Y.XmlElement("frontmatter");
  // const paragraph = new Y.XmlElement("paragraph");

  // yXmlFragment.push([frontmatter, paragraph]);

  // console.log(base64js.fromByteArray(Y.encodeStateAsUpdate(yDoc)));

  const template =
    "AQKRjPGpCQAHAQdkZWZhdWx0Awtmcm9udG1hdHRlcoeRjPGpCQADCXBhcmFncmFwaAA="; // instead of generating a new fragment every time (which could cause duplicate nodes), we use a fixed, pre-encoded Yjs update as our template

  return base64js.toByteArray(template);
}

function getDefaultMetadataYdocArray() {
  const ydoc = new Y.Doc();
  const ymap = ydoc.getMap("noteMetadata");

  ymap.set("starred", "Starred");

  return Y.encodeStateAsUpdate(ydoc); // no need to use pre-encoded fragment since ymap is different
}

export { getDefaultYdocUpdate, getDefaultMetadataYdocArray };
