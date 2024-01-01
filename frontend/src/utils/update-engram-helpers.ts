const parser = new DOMParser();

interface BlockUpdate {
  orderNumber?: number;
  content?: string;
  createdEngramLinks?: string[];
  deletedEngramLinks?: string[];
}
type UpdatedBlocks = {
  [id: string]: BlockUpdate;
};

function getBlocksArray(blocks: string) {
  return Array.from(parser.parseFromString(blocks, "text/html").body.children).map((child: Element) => child.outerHTML);
}

function getBlocksObject(blocksArray: string[]) {
  return blocksArray.reduce((acc: { [key: string]: string }, block) => {
    const id = parser.parseFromString(block, "text/html").body.firstElementChild?.id || "";

    acc[id] = block;
    return acc;
  }, {});
}

function IsNonTagLinkBlock(element: Element) {
  if (element.hasAttribute("istag")) {
    return true;
  }

  return element.parentNode?.children.length === 1 && element.parentNode?.textContent === "";
}

function isModifiedBlockLinkUniqueInBlocks({
  modifiedLink,
  isLinkUnique,
}: {
  modifiedLink: string;
  isLinkUnique: boolean;
}) {
  if (modifiedLink.includes('istag="true"')) {
    return true;
  }

  return isLinkUnique;
}

function getModifiedEngramLinks({
  blockPreUpdate,
  block,
  blocksPreUpdate,
  blocks,
}: {
  blockPreUpdate: string;
  block: string;
  blocksPreUpdate?: string;
  blocks?: string;
}) {
  const blockDocPreUpdate = parser.parseFromString(blockPreUpdate, "text/html");
  const blockDoc = parser.parseFromString(block, "text/html");

  const engramLinksPreUpdate = Array.from(
    new Set(
      Array.from(blockDocPreUpdate.querySelectorAll("engram-link"))
        .filter(IsNonTagLinkBlock)
        .map((element) => element.outerHTML),
    ),
  );
  const engramLinks = Array.from(
    new Set(
      Array.from(blockDoc.querySelectorAll("engram-link"))
        .filter(IsNonTagLinkBlock)
        .map((element) => element.outerHTML),
    ),
  );

  const deletedEngramLinks = engramLinksPreUpdate
    .filter((engramLink) => !engramLinks.includes(engramLink))
    .filter((engramLink) =>
      isModifiedBlockLinkUniqueInBlocks({
        modifiedLink: engramLink,
        isLinkUnique: blocks ? !blocks.replace(block, "").includes(engramLink) : false,
      }),
    );
  const createdEngramLinks = engramLinks
    .filter((engramLink) => !engramLinksPreUpdate.includes(engramLink))
    .filter((engramLink) =>
      isModifiedBlockLinkUniqueInBlocks({
        modifiedLink: engramLink,
        isLinkUnique: blocksPreUpdate ? !blocksPreUpdate.replace(blockPreUpdate, "").includes(engramLink) : false,
      }),
    );

  return { deletedEngramLinks, createdEngramLinks };
}

export function getBlocksUpdatePayload(blocksPreUpdate: string, blocks: string) {
  const blocksArrayPreUpdate = getBlocksArray(blocksPreUpdate);
  const blocksArray = getBlocksArray(blocks);

  const blocksObjectPreUpdate = getBlocksObject(blocksArrayPreUpdate);
  const blocksObject = getBlocksObject(blocksArray);

  const blockKeysPreUpdate = Object.keys(blocksObjectPreUpdate);
  const blockKeys = Object.keys(blocksObject);

  const payload: UpdatedBlocks = {};

  for (let i = 0; i < blockKeys.length; i++) {
    const blockKey = blockKeys[i];

    if (!(blockKey in blocksObjectPreUpdate)) {
      const { createdEngramLinks } = getModifiedEngramLinks({
        blockPreUpdate: "",
        block: blocksObject[blockKey],
        blocksPreUpdate,
        blocks,
      });

      payload[blockKey] = {
        orderNumber: i,
        content: blocksObject[blockKey],
        ...(createdEngramLinks.length && { createdEngramLinks }),
      };
    } else {
      if (i !== blockKeysPreUpdate.indexOf(blockKey)) {
        payload[blockKey] = {
          ...payload[blockKey],
          orderNumber: i,
        };
      }

      if (blocksObject[blockKey] !== blocksObjectPreUpdate[blockKey]) {
        const { createdEngramLinks, deletedEngramLinks } = getModifiedEngramLinks({
          blockPreUpdate: blocksObjectPreUpdate[blockKey] || "",
          block: blocksObject[blockKey] || "",
          blocksPreUpdate,
          blocks,
        });

        payload[blockKey] = {
          ...payload[blockKey],
          content: blocksObject[blockKey],
          ...(createdEngramLinks.length && { createdEngramLinks }),
          ...(deletedEngramLinks.length && { deletedEngramLinks }),
        };
      }
    }
  }

  for (let j = 0; j < blockKeysPreUpdate.length; j++) {
    const blockKeyPreUpdate = blockKeysPreUpdate[j];

    if (!(blockKeyPreUpdate in blocksObject)) {
      const { deletedEngramLinks } = getModifiedEngramLinks({
        blockPreUpdate: blocksObjectPreUpdate[blockKeyPreUpdate],
        block: "",
        blocksPreUpdate,
        blocks,
      });

      payload[blockKeyPreUpdate] = {
        ...(deletedEngramLinks.length && { deletedEngramLinks }),
      };
    }
  }

  return payload;
}

export function getRenamePayload(title: string, pendingTitle: string) {
  const { createdEngramLinks, deletedEngramLinks } = getModifiedEngramLinks({
    blockPreUpdate: title,
    block: pendingTitle,
  });

  return {
    newEngramTitle: pendingTitle,
    ...(createdEngramLinks.length && { createdEngramLinks }),
    ...(deletedEngramLinks.length && { deletedEngramLinks }),
  };
}
