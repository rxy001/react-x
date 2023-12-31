import { TEXT_NODE } from "../shared/HTMLNodeType"

/**
 * Set the textContent property of a node. For text updates, it's faster
 * to set the `nodeValue` of the Text node directly instead of using
 * `.textContent` which will remove the existing node and create a new one.
 *
 * @param {DOMElement} node
 * @param {string} text
 * @internal
 */
const setTextContent = function setTextContent(
  node: HTMLElement,
  text: string,
): void {
  if (text) {
    const { firstChild } = node

    if (
      firstChild &&
      firstChild === node.lastChild &&
      firstChild.nodeType === TEXT_NODE
    ) {
      firstChild.nodeValue = text
      return
    }
  }
  node.textContent = text
}

export default setTextContent
