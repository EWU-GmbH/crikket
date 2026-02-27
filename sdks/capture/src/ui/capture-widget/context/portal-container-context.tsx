import { createContext, useContext } from "react"

const PortalContainerContext = createContext<HTMLElement | ShadowRoot | null>(
  null
)

export function PortalContainerProvider(props: {
  children: React.ReactNode
  value: HTMLElement | ShadowRoot | null
}): React.JSX.Element {
  return (
    <PortalContainerContext.Provider value={props.value}>
      {props.children}
    </PortalContainerContext.Provider>
  )
}

export function usePortalContainer(): HTMLElement | ShadowRoot | null {
  return useContext(PortalContainerContext)
}
