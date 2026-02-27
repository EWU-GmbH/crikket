import { useEffect } from "react"
import { init } from "./index"
import type { CaptureInitOptions } from "./types"

export type CapturePluginProps = CaptureInitOptions

export function CapturePlugin(
  props: CapturePluginProps
): React.JSX.Element | null {
  useEffect(() => {
    const normalizedKey = props.publicKey?.trim()
    if (!normalizedKey) {
      return
    }

    const controller = init({
      autoMount: props.autoMount,
      endpoint: props.endpoint,
      mountTarget: props.mountTarget,
      publicKey: normalizedKey,
      submitPath: props.submitPath,
      submitTransport: props.submitTransport,
      zIndex: props.zIndex,
    })

    return () => {
      controller.destroy()
    }
  }, [
    props.autoMount,
    props.endpoint,
    props.mountTarget,
    props.publicKey,
    props.submitPath,
    props.submitTransport,
    props.zIndex,
  ])

  return null
}
