"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/utils/orpc"
import { MyReportedBugReportCard } from "./my-reported-bug-report-card"

export function MyReportedBugReports() {
  const { data, isLoading } = useQuery(orpc.bugReport.listMine.queryOptions())
  const items = data?.items ?? []

  if (!isLoading && items.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="my-reported-heading"
      className="flex flex-col gap-3"
    >
      <div>
        <h2 className="font-semibold text-xl" id="my-reported-heading">
          Meine Meldungen
        </h2>
        <p className="text-muted-foreground text-sm">
          Von Ihnen eingereichte Meldungen in anderen Organisationen
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {["m1", "m2", "m3"].map((skeletonKey) => (
            <div
              className="aspect-video w-full animate-pulse rounded-lg bg-muted"
              key={skeletonKey}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map((item) => (
            <MyReportedBugReportCard key={item.id} report={item} />
          ))}
        </div>
      )}
    </section>
  )
}
