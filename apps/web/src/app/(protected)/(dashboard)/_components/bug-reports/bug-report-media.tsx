"use client"

import { Badge } from "@crikket/ui/components/ui/badge"
import { Clapperboard, FileQuestion, ImageIcon, Play } from "lucide-react"
import Image from "next/image"
import { type SyntheticEvent, useCallback, useRef } from "react"

export interface BugReportMediaFields {
  title: string
  thumbnail?: string | undefined
  attachmentUrl?: string | undefined
  attachmentType?: "video" | "screenshot" | undefined
  duration?: string | undefined
}

export function MediaTypeBadge({
  attachmentType,
}: {
  attachmentType: BugReportMediaFields["attachmentType"]
}) {
  if (attachmentType === "video") {
    return (
      <Badge className="border-white/15 bg-black/75 text-white backdrop-blur-sm hover:bg-black/75">
        <Clapperboard className="size-3" />
        Video
      </Badge>
    )
  }

  if (attachmentType === "screenshot") {
    return (
      <Badge className="border-white/15 bg-black/75 text-white backdrop-blur-sm hover:bg-black/75">
        <ImageIcon className="size-3" />
        Screenshot
      </Badge>
    )
  }

  // Keep the org grid visually unchanged when no attachment type is set.
  return null
}

export function MediaPreview({
  report,
  emptyLabel,
}: {
  report: BugReportMediaFields
  emptyLabel?: string
}) {
  if (report.thumbnail) {
    return (
      <Image
        alt={report.title}
        className="object-cover transition-transform group-hover:scale-105"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 20vw"
        src={report.thumbnail}
      />
    )
  }

  if (report.attachmentType === "video" && report.attachmentUrl) {
    return <VideoThumbnail report={report} />
  }

  if (report.attachmentType === "screenshot" && report.attachmentUrl) {
    return (
      <Image
        alt={report.title}
        className="object-cover transition-transform group-hover:scale-105"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1200px) 50vw, 20vw"
        src={report.attachmentUrl}
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <FileQuestion
        aria-hidden="true"
        className="h-10 w-10 text-muted-foreground"
      />
      {emptyLabel ? (
        <p className="line-clamp-2 text-muted-foreground text-xs">
          {emptyLabel}
        </p>
      ) : null}
    </div>
  )
}

function VideoThumbnail({ report }: { report: BugReportMediaFields }) {
  const hasSeekedRef = useRef(false)

  const handleLoadedMetadata = useCallback(
    (event: SyntheticEvent<HTMLVideoElement>) => {
      if (hasSeekedRef.current) {
        return
      }

      const player = event.currentTarget
      const durationSeconds =
        Number.isFinite(player.duration) && player.duration > 0
          ? player.duration
          : 0
      const targetSeconds =
        durationSeconds > 0
          ? Math.min(Math.max(durationSeconds * 0.2, 0.15), durationSeconds / 2)
          : 0

      hasSeekedRef.current = true

      if (targetSeconds <= 0) {
        return
      }

      const handleSeeked = () => {
        player.pause()
      }

      player.addEventListener("seeked", handleSeeked, { once: true })

      try {
        player.currentTime = targetSeconds
      } catch {
        hasSeekedRef.current = false
      }
    },
    []
  )

  return (
    <>
      <video
        aria-hidden="true"
        className="h-full w-full object-cover transition-transform group-hover:scale-105"
        muted
        onLoadedMetadata={handleLoadedMetadata}
        playsInline
        preload="metadata"
        src={report.attachmentUrl}
        tabIndex={-1}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="rounded-full border border-white/20 bg-black/60 p-3 text-white shadow-sm backdrop-blur-sm">
          <Play className="size-5 fill-current" />
        </div>
      </div>
    </>
  )
}
