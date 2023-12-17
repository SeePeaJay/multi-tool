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

function getModifiedEngramLinks(oldBlock: string, newBlock: string) {
  const oldBlockDoc = parser.parseFromString(oldBlock, "text/html");
  const newBlockDoc = parser.parseFromString(newBlock, "text/html");

  const oldEngramLinks = Array.from(
    new Set(Array.from(oldBlockDoc.querySelectorAll("engram-link")).map((element) => element.outerHTML)),
  );
  const newEngramLinks = Array.from(
    new Set(Array.from(newBlockDoc.querySelectorAll("engram-link")).map((element) => element.outerHTML)),
  );

  const deletedEngramLinks = oldEngramLinks.filter((engramLink) => !newEngramLinks.includes(engramLink));
  const createdEngramLinks = newEngramLinks.filter((engramLink) => !oldEngramLinks.includes(engramLink));

  console.log(deletedEngramLinks, createdEngramLinks);

  return { deletedEngramLinks, createdEngramLinks };
}

export function getPayload(oldBlocks: string, newBlocks: string) {
  const oldBlocksArray = getBlocksArray(oldBlocks);
  const newBlocksArray = getBlocksArray(newBlocks);

  const oldBlocksObject = getBlocksObject(oldBlocksArray);
  const newBlocksObject = getBlocksObject(newBlocksArray);

  const oldBlocksKeys = Object.keys(oldBlocksObject);
  const newBlocksKeys = Object.keys(newBlocksObject);

  const payload: UpdatedBlocks = {};

  for (let i = 0; i < newBlocksKeys.length; i++) {
    const newBlocksKey = newBlocksKeys[i];

    if (!(newBlocksKey in oldBlocksObject)) {
      const { createdEngramLinks } = getModifiedEngramLinks("", newBlocksObject[newBlocksKey]);

      payload[newBlocksKey] = {
        orderNumber: i,
        content: newBlocksObject[newBlocksKey],
        ...(createdEngramLinks.length && { createdEngramLinks }),
      };
    } else {
      if (i !== oldBlocksKeys.indexOf(newBlocksKey)) {
        payload[newBlocksKey] = {
          ...payload[newBlocksKey],
          orderNumber: i,
        };
      }

      if (newBlocksObject[newBlocksKey] !== oldBlocksObject[newBlocksKey]) {
        const { createdEngramLinks, deletedEngramLinks } = getModifiedEngramLinks(
          oldBlocksObject[newBlocksKey] || "",
          newBlocksObject[newBlocksKey] || "",
        );

        payload[newBlocksKey] = {
          ...payload[newBlocksKey],
          content: newBlocksObject[newBlocksKey],
          ...(createdEngramLinks.length && { createdEngramLinks }),
          ...(deletedEngramLinks.length && { deletedEngramLinks }),
        };
      }
    }
  }

  for (let j = 0; j < oldBlocksKeys.length; j++) {
    const oldBlocksKey = oldBlocksKeys[j];

    if (!(oldBlocksKey in newBlocksObject)) {
      const { deletedEngramLinks } = getModifiedEngramLinks(oldBlocksObject[oldBlocksKey], "");

      payload[oldBlocksKey] = {
        ...(deletedEngramLinks.length && { deletedEngramLinks }),
      };
    }
  }

  return payload;
}
