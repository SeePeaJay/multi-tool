import { ReactRenderer } from "@tiptap/react";
import Mention, { MentionOptions } from "@tiptap/extension-mention";
import NoteSuggestionMenu, {
  NoteSuggestionMenuRef,
  NoteSuggestion,
} from "../components/NoteSuggestionMenu";
import tippy, { Instance as TippyInstance } from "tippy.js";

const DOM_RECT_FALLBACK: DOMRect = {
  bottom: 0,
  height: 0,
  left: 0,
  right: 0,
  top: 0,
  width: 0,
  x: 0,
  y: 0,
  toJSON() {
    return {};
  },
};

// Define the NoteLink extension with proper typing
export const noteLinkSuggestionOptions: MentionOptions["suggestion"] = {
  char: "[[",
  allowSpaces: true,

  // Replace this `items` code with a call to your API that returns suggestions
  // of whatever sort you like (including potentially additional data beyond
  // just an ID and a label). It need not be async but is written that way for
  // the sake of example.
  items: async ({ query }): Promise<NoteSuggestion[]> =>
    Promise.resolve(
      [
        "Lea Thompson",
        "Cyndi Lauper",
        "Tom Cruise",
        "Madonna",
        "Jerry Hall",
        "Joan Collins",
        "Winona Ryder",
        "Christina Applegate",
        "Alyssa Milano",
        "Molly Ringwald",
        "Ally Sheedy",
        "Debbie Harry",
        "Olivia Newton-John",
        "Elton John",
        "Michael J. Fox",
        "Axl Rose",
        "Emilio Estevez",
        "Ralph Macchio",
        "Rob Lowe",
        "Jennifer Grey",
        "Mickey Rourke",
        "John Cusack",
        "Matthew Broderick",
        "Justine Bateman",
        "Lisa Bonet",
        "Benicio Monserrate Rafael del Toro Sánchez",
      ]
        // Typically we'd be getting this data from an API where we'd have a
        // definitive "id" to use for each suggestion item, but for the sake of
        // example, we'll just set the index within this hardcoded list as the
        // ID of each item.
        .map((name, index) => ({ mentionLabel: name, id: index.toString() }))
        // Find matching entries based on what the user has typed so far (after
        // the @ symbol)
        .filter((item) =>
          item.mentionLabel.toLowerCase().startsWith(query.toLowerCase()),
        )
        .slice(0, 5),
    ),

  render: () => {
    let component: ReactRenderer<NoteSuggestionMenuRef> | undefined;
    let popup: TippyInstance | undefined;

    return {
      onStart: (props) => {
        component = new ReactRenderer(NoteSuggestionMenu, {
          props,
          editor: props.editor,
        });

        popup = tippy("body", {
          getReferenceClientRect: () =>
            props.clientRect?.() ?? DOM_RECT_FALLBACK,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        })[0];
      },

      onUpdate(props) {
        component?.updateProps(props);

        popup?.setProps({
          getReferenceClientRect: () =>
            props.clientRect?.() ?? DOM_RECT_FALLBACK,
        });
      },

      onKeyDown(props) {
        if (props.event.key === "Escape") {
          popup?.hide();
          return true;
        }

        if (!component?.ref) {
          return false;
        }

        return component.ref.onKeyDown(props);
      },

      onExit() {
        popup?.destroy();
        component?.destroy();

        // Remove references to the old popup and component upon destruction/exit.
        // (This should prevent redundant calls to `popup.destroy()`, which Tippy
        // warns in the console is a sign of a memory leak, as the `suggestion`
        // plugin seems to call `onExit` both when a suggestion menu is closed after
        // a user chooses an option, *and* when the editor itself is destroyed.)
        popup = undefined;
        component = undefined;
      },
    };
  },
};

const NoteLink = Mention.configure({
  HTMLAttributes: {
    class: "note-link",
  },
  // renderText({ node }) {
  //   return `[[${node.attrs.label ?? node.attrs.id}]]`;
  // },
  renderHTML({ options, node }) {
    // console.log(options.HTMLAttributes);
    // const { "data-id": _, "data-type": __, ...attributesToRender } = options.HTMLAttributes;

    return [
      "span",
      options.HTMLAttributes,
      `[[${node.attrs.label ?? node.attrs.id}]]`,
    ];
  },
  deleteTriggerWithBackspace: true,
  suggestion: noteLinkSuggestionOptions,
});

export default NoteLink;
