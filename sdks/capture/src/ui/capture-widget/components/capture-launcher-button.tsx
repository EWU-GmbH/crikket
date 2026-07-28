import { Bug, Lightbulb } from "lucide-react"

export function CaptureLauncherButton(props: {
  disabled: boolean
  onClick: () => void
  zIndex: number
}): React.JSX.Element {
  return (
    <button
      aria-label="Feedback geben"
      className="capture-launcher"
      disabled={props.disabled}
      onClick={props.onClick}
      style={{ ["--capture-z-index" as string]: String(props.zIndex) }}
      type="button"
    >
      <span>Feedback</span>
      <Bug aria-hidden="true" size={16} strokeWidth={1.75} />
      <Lightbulb aria-hidden="true" size={16} strokeWidth={1.75} />
    </button>
  )
}
