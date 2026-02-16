import { paginationConfig } from "@crikket/shared/config/pagination"

interface SearchParams {
  [key: string]: string | string[] | undefined
}

function getSingleValue(
  searchParams: SearchParams,
  key: string
): string | undefined {
  const value = searchParams[key]

  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

function parseSearchValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const normalized = value.trim()

  return normalized.length > 0 ? normalized : undefined
}

export function parseMembersQuery(searchParams: SearchParams) {
  const page = parsePositiveInt(
    getSingleValue(searchParams, "page"),
    paginationConfig.defaultPage
  )
  const requestedPerPage = parsePositiveInt(
    getSingleValue(searchParams, "perPage"),
    paginationConfig.defaultPageSize
  )
  const perPage = Math.min(requestedPerPage, paginationConfig.maxPageSize)
  const offset = (page - 1) * perPage
  const search = parseSearchValue(getSingleValue(searchParams, "search"))

  return {
    page,
    perPage,
    offset,
    search,
  }
}
