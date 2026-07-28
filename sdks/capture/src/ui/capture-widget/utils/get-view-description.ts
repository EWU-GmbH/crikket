import type { CaptureUiState } from "../../types"

export function getViewDescription(view: CaptureUiState["view"]): string {
  if (view === "chooser") {
    return "Erfassungsart wählen"
  }

  if (view === "feature-request") {
    return "Feature vorschlagen"
  }

  if (view === "review") {
    return "Prüfen und absenden"
  }

  if (view === "success") {
    return "Meldung abgeschlossen"
  }

  return "Problemdetails erfassen"
}
