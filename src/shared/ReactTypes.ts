import type { ReactElement } from "react"

export type ReactNode =
  | ReactElement<any>
  | ReactPortal
  | ReactText
  | ReactFragment
  | ReactProvider<any>
  | ReactConsumer<any>

export type ReactEmpty = null | void | boolean

export type ReactFragment = ReactEmpty | Iterable<ReactNode>

export type ReactNodeList = ReactEmpty | ReactNode

export type ReactText = string | number

export type ReactProvider<T> = {
  $$typeof: Symbol | number
  type: ReactProviderType<T>
  key: null | string
  ref: null
  props: {
    value: T
    children?: ReactNodeList
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type ReactProviderType<T> = {
  $$typeof: Symbol | number
  _context: ReactContext<T>
  [key: string]: unknown
}

export type ReactConsumer<T> = {
  $$typeof: Symbol | number
  type: ReactContext<T>
  key: null | string
  ref: null
  props: {
    children: (value: T) => ReactNodeList
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type ReactContext<T> = {
  $$typeof: Symbol | number
  Consumer: ReactContext<T>
  Provider: ReactProviderType<T>
  _currentValue: T
  _currentValue2: T
  _threadCount: number
  // DEV only
  _currentRenderer?: Object | null
  _currentRenderer2?: Object | null
  // This value may be added by application code
  // to improve DEV tooling display names
  displayName?: string

  // only used by ServerContext
  _defaultValue: T
  _globalName: string
  [key: string]: unknown
}

export type ReactPortal = {
  $$typeof: Symbol | number
  key: null | string
  containerInfo: any
  children: ReactNodeList
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any
  [key: string]: unknown
}

export type RefObject = {
  current: any
}

export interface Wakeable {
  then(onFulfill: () => unknown, onReject: () => unknown): void | Wakeable
}
