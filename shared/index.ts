import { getDefaultYdocUpdate, getDefaultMetadataYdocArray } from "./yjs.js";
import { createContentEditorExtensions } from "./tiptap/content-editor-extensions.js";
import {
  noteEmbedNodeName,
  noteEmbedTriggerChar,
} from "./tiptap/note-embed.js";
import {
  noteReferenceNodeName,
  noteReferenceTriggerChar,
} from "./tiptap/note-reference.js";
import { tagNodeName, tagTriggerChar } from "./tiptap/tag.js";

export {
  noteEmbedNodeName,
  noteEmbedTriggerChar,
  noteReferenceNodeName,
  noteReferenceTriggerChar,
  tagNodeName,
  tagTriggerChar,
  getDefaultYdocUpdate,
  getDefaultMetadataYdocArray,
  createContentEditorExtensions,
};
