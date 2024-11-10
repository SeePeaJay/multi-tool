import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { MentionNodeAttrs } from "@tiptap/extension-mention";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";

export type NoteSuggestion = {
  id: string;
  mentionLabel: string;
};

export type NoteSuggestionMenuRef = {
  // For convenience using this SuggestionList from within the
  // mentionSuggestionOptions, we'll match the signature of SuggestionOptions's
  // `onKeyDown` returned in its `render` function
  onKeyDown: NonNullable<
    ReturnType<
      NonNullable<SuggestionOptions<NoteSuggestion>["render"]>
    >["onKeyDown"]
  >;
};

export type NoteSuggestionMenuProps = SuggestionProps<NoteSuggestion>;

const NoteSuggestionMenu = forwardRef<
  NoteSuggestionMenuRef,
  NoteSuggestionMenuProps
>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    if (index >= props.items.length) {
      // Make sure we actually have enough items to select the given index. For
      // instance, if a user presses "Enter" when there are no options, the index will
      // be 0 but there won't be any items, so just ignore the callback here
      return;
    }

    const suggestion = props.items[index];

    // Set all of the attributes of our Mention node based on the suggestion
    // data. The fields of `suggestion` will depend on whatever data you
    // return from your `items` function in your "suggestion" options handler.
    // Our suggestion handler returns `MentionSuggestion`s (which we've
    // indicated via SuggestionProps<MentionSuggestion>). We are passing an
    // object of the `MentionNodeAttrs` shape when calling `command` (utilized
    // by the Mention extension to create a Mention Node).
    const mentionItem: MentionNodeAttrs = {
      id: suggestion.id,
      label: suggestion.mentionLabel,
    };
    // there is currently a bug in the Tiptap SuggestionProps
    // type where if you specify the suggestion type (like
    // `SuggestionProps<MentionSuggestion>`), it will incorrectly require that
    // type variable for `command`'s argument as well (whereas instead the
    // type of that argument should be the Mention Node attributes). This
    // should be fixed once https://github.com/ueberdosis/tiptap/pull/4136 is
    // merged and we can add a separate type arg to `SuggestionProps` to
    // specify the type of the commanded selected item.
    props.command(mentionItem);
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + props.items.length - 1) % props.items.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div className="dropdown-menu">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={index === selectedIndex ? "is-selected" : ""}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.mentionLabel}
          </button>
        ))
      ) : (
        <div className="item">No result</div>
      )}
    </div>
  );
});

NoteSuggestionMenu.displayName = "SuggestionList";

export default NoteSuggestionMenu;
