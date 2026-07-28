import { useEffect, useRef, useState } from "react"
import { toUserError } from "../../../utils"
import type {
  CaptureReviewSubmitOptions,
  CaptureUiCallbacks,
  CaptureUiHandlers,
  CaptureUiStore,
} from "../../types"
import {
  isValidReporterEmail,
  storeReporterEmail,
} from "../../utils/reporter-email"

const COPY_RESET_DELAY_MS = 1500

interface UseCaptureUiHandlersInput {
  callbacks: CaptureUiCallbacks
  shareUrl: string
  store: CaptureUiStore
}

interface UseCaptureUiHandlersResult {
  handlers: CaptureUiHandlers
  isSubmitPending: boolean
}

export function useCaptureUiHandlers(
  input: UseCaptureUiHandlersInput
): UseCaptureUiHandlersResult {
  const copyResetTimeoutRef = useRef<number | null>(null)
  const [isSubmitPending, setIsSubmitPending] = useState(false)

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
    }
  }, [])

  const runBusyTask = async (task: () => Promise<void>): Promise<void> => {
    input.store.patchState({
      busy: true,
      errorMessage: null,
    })

    try {
      await task()
    } finally {
      input.store.patchState({
        busy: false,
      })
    }
  }

  const startBusyTask = (task: () => Promise<void>) => {
    runBusyTask(task).catch(() => undefined)
  }

  const showCaptureError = (error: unknown) => {
    input.store.openChooser()
    input.store.showError(toUserError(error))
  }

  return {
    isSubmitPending,
    handlers: {
      onLauncherClick: () => {
        input.callbacks.onReset()
        input.store.openChooser()
      },
      onClose: () => {
        input.callbacks.onClose()
      },
      onStartVideo: () => {
        startBusyTask(async () => {
          try {
            const result = await input.callbacks.onStartVideo()
            input.store.showRecording(result.startedAt)
          } catch (error) {
            showCaptureError(error)
          }
        })
      },
      onTakeScreenshot: () => {
        startBusyTask(async () => {
          try {
            await input.callbacks.onTakeScreenshot()
          } catch (error) {
            showCaptureError(error)
          }
        })
      },
      onOpenFeatureRequest: () => {
        input.store.openFeatureRequest()
      },
      onFeatureRequestTitleChange: (value) => {
        const current = input.store.getSnapshot().featureRequestDraft
        input.store.patchState({
          featureRequestDraft: {
            ...current,
            title: value.slice(0, 200),
          },
          errorMessage: null,
        })
      },
      onFeatureRequestDescriptionChange: (value) => {
        const current = input.store.getSnapshot().featureRequestDraft
        input.store.patchState({
          featureRequestDraft: {
            ...current,
            description: value.slice(0, 4000),
          },
          errorMessage: null,
        })
      },
      onFeatureRequestEmailChange: (value) => {
        const current = input.store.getSnapshot().featureRequestDraft
        input.store.patchState({
          featureRequestDraft: {
            ...current,
            email: value.slice(0, 320),
          },
          errorMessage: null,
        })
      },
      onStopRecording: () => {
        startBusyTask(async () => {
          try {
            await input.callbacks.onStopRecording()
          } catch (error) {
            showCaptureError(error)
          }
        })
      },
      onSubmit: (draft, options?: CaptureReviewSubmitOptions) => {
        setIsSubmitPending(true)
        input.store.patchState({
          errorMessage: null,
          reviewDraft: draft,
        })

        return input.callbacks
          .onSubmit(draft, options)
          .then(() => {
            if (draft.reporterEmail) {
              storeReporterEmail(draft.reporterEmail)
            }
          })
          .catch((error) => {
            input.store.showError(toUserError(error))
          })
          .finally(() => {
            setIsSubmitPending(false)
          })
      },
      onSubmitFeatureRequest: () => {
        const draft = input.store.getSnapshot().featureRequestDraft
        if (!draft.title.trim()) {
          input.store.showError("Bitte geben Sie einen Titel ein.")
          return Promise.resolve()
        }

        const email = draft.email.trim()
        if (email.length > 0 && !isValidReporterEmail(email)) {
          input.store.showError(
            "Bitte geben Sie eine gültige E-Mail-Adresse ein."
          )
          return Promise.resolve()
        }

        setIsSubmitPending(true)
        input.store.patchState({
          errorMessage: null,
        })

        return input.callbacks
          .onSubmitFeatureRequest(draft)
          .then(() => {
            storeReporterEmail(email)
            input.store.showSuccess("")
          })
          .catch((error) => {
            input.store.showError(toUserError(error))
          })
          .finally(() => {
            setIsSubmitPending(false)
          })
      },
      onCropScreenshot: (blob) => {
        input.callbacks.onCropScreenshot(blob)
      },
      onCancel: () => {
        input.callbacks.onReset()
        input.store.openChooser()
      },
      onRetry: () => {
        input.callbacks.onReset()
        input.store.openChooser()
      },
      onCopyLink: () => {
        if (!input.shareUrl.trim()) {
          return
        }

        navigator.clipboard
          .writeText(input.shareUrl)
          .then(() => {
            input.store.patchState({
              copyLabel: "Kopiert",
            })

            if (copyResetTimeoutRef.current !== null) {
              window.clearTimeout(copyResetTimeoutRef.current)
            }

            copyResetTimeoutRef.current = window.setTimeout(() => {
              input.store.patchState({
                copyLabel: "Link kopieren",
              })
            }, COPY_RESET_DELAY_MS)
          })
          .catch((error: unknown) => {
            input.store.showError(toUserError(error))
          })
      },
      onOpenLink: () => {
        if (!input.shareUrl.trim()) {
          return
        }

        window.open(input.shareUrl, "_blank", "noopener")
      },
    },
  }
}
