import type { FiberRoot, Fiber } from "react-reconciler/src/ReactInternalTypes"
import { DefaultEventPriority } from "react-reconciler/src/ReactEventPriorities"
import { getEventPriority } from "../events/ReactDOMEventListener"
import {
  diffProperties,
  createElement,
  setInitialProperties,
  createTextNode,
} from "./ReactDOMComponent"
import { precacheFiberNode, updateFiberProps } from "./ReactDOMComponentTree"

export type Type = string
export type TextInstance = Text
export type Instance = Element

export type Props = {
  autoFocus?: boolean
  children?: unknown
  disabled?: boolean
  hidden?: boolean
  suppressHydrationWarning?: boolean
  dangerouslySetInnerHTML?: unknown
  style?: { display?: string; [key: string | number]: any }
  bottom?: null | number
  left?: null | number
  right?: null | number
  top?: null | number
  [key: string | number]: any
}

export type Container =
  | (Element & { _reactRootContainer?: FiberRoot })
  | (Document & { _reactRootContainer?: FiberRoot })
  | (DocumentFragment & {
      _reactRootContainer?: FiberRoot
    })

export function getCurrentEventPriority(): any {
  const currentEvent = window.event
  if (currentEvent === undefined) {
    return DefaultEventPriority
  }
  return getEventPriority(currentEvent.type as any)
}

export function shouldSetTextContent(type: string, props: Props): boolean {
  return (
    type === "textarea" ||
    type === "noscript" ||
    typeof props.children === "string" ||
    typeof props.children === "number" ||
    (typeof props.dangerouslySetInnerHTML === "object" &&
      props.dangerouslySetInnerHTML !== null &&
      (props.dangerouslySetInnerHTML as any).__html != null)
  )
}

export function prepareUpdate(
  domElement: Instance,
  type: string,
  oldProps: Props,
  newProps: Props,
): null | Array<unknown> {
  return diffProperties(domElement, type, oldProps, newProps)
}

export function createInstance(
  type: string,
  props: Props,
  internalInstanceHandle: Fiber,
): Instance {
  const domElement: Instance = createElement(type, props, document)
  precacheFiberNode(internalInstanceHandle, domElement)
  updateFiberProps(domElement, props)
  return domElement
}

export function appendInitialChild(
  parentInstance: Instance,
  child: Instance | TextInstance,
): void {
  parentInstance.appendChild(child)
}

export function finalizeInitialChildren(
  domElement: Instance,
  type: string,
  props: Props,
): boolean {
  setInitialProperties(domElement as HTMLElement, type, props)
  switch (type) {
    case "button":
    case "input":
    case "select":
    case "textarea":
      return !!props.autoFocus
    case "img":
      return true
    default:
      return false
  }
}

export function createTextInstance(
  text: string,
  internalInstanceHandle: Fiber,
): TextInstance {
  const textNode: TextInstance = createTextNode(text)
  precacheFiberNode(internalInstanceHandle, textNode)
  return textNode
}
