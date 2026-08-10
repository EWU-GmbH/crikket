import { BUG_REPORT_VISIBILITY_OPTIONS } from "@crikket/shared/constants/bug-report"
import { PRIORITY_OPTIONS } from "@crikket/shared/constants/priorities"
import type {
  CaptureDebuggerSummary,
  CapturedMedia,
  CapturePriority,
} from "../../types"
import type { CaptureUiState, CaptureUiStore } from "../types"

const DEFAULT_PRIORITY: CapturePriority = PRIORITY_OPTIONS.none
const DEFAULT_SUMMARY: CaptureDebuggerSummary = {
  actions: 0,
  logs: 0,
  networkRequests: 0,
}

export function createCaptureUiStore(): CaptureUiStore {
  let state = createInitialState()
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  const patchState = (patch: Partial<CaptureUiState>) => {
    state = {
      ...state,
      ...patch,
    }
    notify()
  }

  const showReview = (input: {
    media: CapturedMedia
    warnings: string[]
    summary: CaptureDebuggerSummary
    knownReporterEmail?: string
  }) => {
    patchState({
      overlayOpen: true,
      recordingDockOpen: false,
      recordingStartedAt: null,
      view: "review",
      errorMessage: null,
      busy: false,
      media: input.media,
      warnings: [...input.warnings],
      summary: input.summary,
      shareUrl: "",
      copyLabel: "Link kopieren",
      reviewDraft: {
        title: "",
        description: "",
        priority: DEFAULT_PRIORITY,
        visibility: BUG_REPORT_VISIBILITY_OPTIONS.private,
        reporterEmail: input.knownReporterEmail ?? "",
      },
      reviewFormKey: input.media.objectUrl,
    })
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    patchState,
    openChooser: () => {
      patchState({
        overlayOpen: true,
        recordingDockOpen: false,
        recordingStartedAt: null,
        view: "chooser",
        errorMessage: null,
        busy: false,
      })
    },
    openFeatureRequest: () => {
      const knownReporterEmail = getKnownReporterEmail(state)
      patchState({
        overlayOpen: true,
        recordingDockOpen: false,
        recordingStartedAt: null,
        view: "feature-request",
        errorMessage: null,
        busy: false,
        featureRequestDraft: {
          title: "",
          description: "",
          email: knownReporterEmail,
        },
      })
    },
    close: () => {
      patchState({
        overlayOpen: false,
        recordingDockOpen: false,
        recordingStartedAt: null,
        busy: false,
        errorMessage: null,
      })
    },
    showRecording: (startedAt) => {
      patchState({
        overlayOpen: false,
        recordingDockOpen: true,
        recordingStartedAt: startedAt,
        view: "recording",
        errorMessage: null,
        busy: false,
      })
    },
    showReview,
    showSuccess: (shareUrl) => {
      patchState({
        overlayOpen: true,
        recordingDockOpen: false,
        recordingStartedAt: null,
        view: "success",
        errorMessage: null,
        busy: false,
        shareUrl: shareUrl ?? "",
        copyLabel: "Link kopieren",
      })
    },
    showError: (message) => {
      patchState({
        errorMessage: message,
      })
    },
    setTitleIfEmpty: (value) => {
      if (state.reviewDraft.title.trim().length > 0) {
        return
      }

      patchState({
        reviewDraft: {
          ...state.reviewDraft,
          title: value.slice(0, 200),
        },
      })
    },
    applyReporterEmailPrefill: (email) => {
      const normalized = email.trim()
      if (normalized.length === 0) {
        return
      }

      const nextReviewDraft = { ...state.reviewDraft }
      if ((nextReviewDraft.reporterEmail?.trim() ?? "").length === 0) {
        nextReviewDraft.reporterEmail = normalized
      }

      const nextFeatureRequestDraft = { ...state.featureRequestDraft }
      if (nextFeatureRequestDraft.email.trim().length === 0) {
        nextFeatureRequestDraft.email = normalized
      }

      patchState({
        reviewDraft: nextReviewDraft,
        featureRequestDraft: nextFeatureRequestDraft,
      })
    },
    destroy: () => {
      state = createInitialState()
      listeners.clear()
    },
  }
}

function getKnownReporterEmail(state: CaptureUiState): string {
  const fromReview = state.reviewDraft.reporterEmail?.trim() ?? ""
  if (fromReview.length > 0) {
    return fromReview
  }

  const fromFeature = state.featureRequestDraft.email.trim()
  if (fromFeature.length > 0) {
    return fromFeature
  }

  return ""
}

function createInitialState(): CaptureUiState {
  return {
    view: "chooser",
    overlayOpen: false,
    recordingDockOpen: false,
    busy: false,
    errorMessage: null,
    recordingStartedAt: null,
    warnings: [],
    summary: { ...DEFAULT_SUMMARY },
    media: null,
    shareUrl: "",
    copyLabel: "Link kopieren",
    reviewDraft: {
      title: "",
      description: "",
      priority: DEFAULT_PRIORITY,
      visibility: BUG_REPORT_VISIBILITY_OPTIONS.private,
      reporterEmail: "",
    },
    reviewFormKey: "",
    featureRequestDraft: {
      title: "",
      description: "",
      email: "",
    },
  }
}
