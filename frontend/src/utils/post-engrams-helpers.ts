const parser = new DOMParser();

interface BlockUpdate {
  orderNumber: number;
  content: string;
}
type UpdatedBlocks = {
  [id: string]: BlockUpdate | null;
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

export function getPayload(oldBlocks: string, newBlocks: string) {
  const oldBlocksArray = getBlocksArray(oldBlocks);
  const newBlocksArray = getBlocksArray(newBlocks);

  const oldBlocksObject = getBlocksObject(oldBlocksArray);
  const newBlocksObject = getBlocksObject(newBlocksArray);

  const oldBlocksKeys = Object.keys(oldBlocksObject);
  const newBlocksKeys = Object.keys(newBlocksObject);
  const payload: UpdatedBlocks = {};

  for (let i = 0; i < Math.max(oldBlocksKeys.length, newBlocksKeys.length); i++) {
    const oldBlocksKey = oldBlocksKeys[i];
    const newBlocksKey = newBlocksKeys[i];

    if (oldBlocksKey && !(oldBlocksKey in newBlocksObject)) {
      payload[oldBlocksKey] = null;
    }

    if (newBlocksKey) {
      payload[newBlocksKey] = {
        orderNumber: i,
        content: newBlocksObject[newBlocksKey],
      };
    }
  }

  return payload;
}
