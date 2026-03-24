import { JSDOM } from "jsdom";

export function htmlToPortableText(html: string): any[] {
  if (!html || !html.trim()) return [];

  const dom = new JSDOM(`<body>${html}</body>`);
  const body = dom.window.document.body;
  const blocks: any[] = [];

  for (const node of Array.from(body.childNodes)) {
    const block = nodeToBlock(node as Element);
    if (block !== null) {
      if (Array.isArray(block)) {
        blocks.push(...block);
      } else {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

function nodeToBlock(node: Element): any | any[] | null {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return makeBlock("normal", [makeSpan(text)]);
  }

  if (node.nodeType !== 1 /* ELEMENT_NODE */) return null;

  const tag = node.tagName.toLowerCase();

  if (tag === "p") {
    return makeBlock("normal", childrenToSpans(node));
  }

  if (tag === "h1") return makeBlock("h1", childrenToSpans(node));
  if (tag === "h2") return makeBlock("h2", childrenToSpans(node));
  if (tag === "h3") return makeBlock("h3", childrenToSpans(node));
  if (tag === "h4") return makeBlock("h4", childrenToSpans(node));
  if (tag === "h5") return makeBlock("h5", childrenToSpans(node));
  if (tag === "h6") return makeBlock("h6", childrenToSpans(node));
  if (tag === "blockquote") return makeBlock("blockquote", childrenToSpans(node));

  if (tag === "ul") {
    return listItemsToBlocks(node, "bullet");
  }

  if (tag === "ol") {
    return listItemsToBlocks(node, "number");
  }

  if (tag === "img") {
    return {
      _type: "wpImage",
      _key: randomKey(),
      src: node.getAttribute("src") || "",
      alt: node.getAttribute("alt") || "",
    };
  }

  if (tag === "figure") {
    const img = node.querySelector("img");
    if (img) {
      return {
        _type: "wpImage",
        _key: randomKey(),
        src: img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
      };
    }
  }

  // Fallback: treat as paragraph if it has text
  const text = node.textContent?.trim();
  if (text) {
    return makeBlock("normal", childrenToSpans(node));
  }

  return null;
}

function listItemsToBlocks(listNode: Element, listItem: "bullet" | "number"): any[] {
  const blocks: any[] = [];
  for (const child of Array.from(listNode.childNodes)) {
    if ((child as Element).nodeType !== 1) continue;
    const el = child as Element;
    if (el.tagName.toLowerCase() === "li") {
      blocks.push({
        _type: "block",
        _key: randomKey(),
        style: "normal",
        listItem,
        level: 1,
        children: childrenToSpans(el),
        markDefs: [],
      });
    }
  }
  return blocks;
}

function childrenToSpans(node: Element): any[] {
  const spans: any[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3 /* TEXT */) {
      const text = child.textContent || "";
      if (text) spans.push(makeSpan(text));
    } else if (child.nodeType === 1 /* ELEMENT */) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      const marks: string[] = [];

      if (tag === "strong" || tag === "b") marks.push("strong");
      if (tag === "em" || tag === "i") marks.push("em");
      if (tag === "u") marks.push("underline");
      if (tag === "code") marks.push("code");

      const text = el.textContent || "";
      if (text) spans.push(makeSpan(text, marks));
    }
  }

  if (spans.length === 0) {
    const text = node.textContent?.trim() || "";
    if (text) spans.push(makeSpan(text));
  }

  return spans;
}

function makeBlock(style: string, children: any[]): any {
  return {
    _type: "block",
    _key: randomKey(),
    style,
    children: children.length > 0 ? children : [makeSpan("")],
    markDefs: [],
  };
}

function makeSpan(text: string, marks: string[] = []): any {
  return {
    _type: "span",
    _key: randomKey(),
    text,
    marks,
  };
}

function randomKey(): string {
  return Math.random().toString(36).slice(2, 10);
}
