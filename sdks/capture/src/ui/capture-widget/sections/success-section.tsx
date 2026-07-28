import type { CaptureUiHandlers, CaptureUiState } from "../../types"
import { CheckIcon, CopyIcon, ExternalLinkIcon } from "../components/icons"
import { Button } from "../components/primitives/button"
import { Input } from "../components/primitives/input"
import { Label } from "../components/primitives/label"

export function SuccessSection(props: {
  state: CaptureUiState
  handlers: CaptureUiHandlers
}): React.JSX.Element {
  const hasCopied = props.state.copyLabel === "Kopiert"
  const isFeatureRequest = props.state.shareUrl.trim().length === 0

  if (isFeatureRequest) {
    return (
      <section className="grid gap-5 p-5">
        <div className="grid gap-1 text-center">
          <strong className="text-green-700 text-xl">
            Feature-Request gesendet
          </strong>
          <p className="m-0 text-muted-foreground text-sm">
            Danke — Ihre Idee wurde an das Team-Board gesendet.
          </p>
        </div>
        <Button
          className="w-full"
          disabled={props.state.busy}
          onClick={props.handlers.onRetry}
          type="button"
        >
          Fertig
        </Button>
      </section>
    )
  }

  return (
    <section className="grid gap-5 p-5">
      <div className="grid gap-1 text-center">
        <strong className="text-green-700 text-xl">
          Fehlerbericht gesendet
        </strong>
        <p className="m-0 text-muted-foreground text-sm">
          Ihr Fehlerbericht wurde erfolgreich erstellt.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Freigabe-Link</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="flex-1"
            readOnly
            type="text"
            value={props.state.shareUrl}
          />
          <Button
            aria-label={hasCopied ? "Kopiert" : "Link kopieren"}
            className="shrink-0"
            disabled={props.state.busy}
            onClick={props.handlers.onCopyLink}
            size="icon"
            type="button"
            variant="outline"
          >
            {hasCopied ? (
              <CheckIcon className="h-4 w-4" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          className="w-full gap-2"
          disabled={props.state.busy}
          onClick={props.handlers.onOpenLink}
          type="button"
          variant="outline"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          Link öffnen
        </Button>
        <Button
          className="w-full gap-2"
          disabled={props.state.busy}
          onClick={props.handlers.onRetry}
          type="button"
        >
          Weiteren erfassen
        </Button>
      </div>
    </section>
  )
}
