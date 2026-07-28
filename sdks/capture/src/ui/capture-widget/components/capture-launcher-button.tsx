export function CaptureLauncherButton(props: {
  disabled: boolean
  onClick: () => void
  zIndex: number
}): React.JSX.Element {
  return (
    <button
      aria-label="Ein Problem melden"
      className="capture-launcher"
      disabled={props.disabled}
      onClick={props.onClick}
      style={{ ["--capture-z-index" as string]: String(props.zIndex) }}
      type="button"
    >
      Fehler melden
    </button>
  )
}
