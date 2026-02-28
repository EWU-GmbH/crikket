import { createContext, useContext } from "react"

const PortalContainerContext = createContext<HTMLElement | null>(null)

export function PortalContainerProvider(props: {
  children: React.ReactNode
  value: HTMLElement | null
}): React.JSX.Element {
  return (
    <PortalContainerContext.Provider value={props.value}>
      {props.children}
    </PortalContainerContext.Provider>
  )
}

export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext)
}
