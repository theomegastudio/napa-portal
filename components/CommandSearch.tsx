'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
  MagnifyingGlass,
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText, File,
  ArrowSquareOut,
} from '@phosphor-icons/react'
import { getFileIconName, getFileIconColor, type FileIconName } from '@/lib/file-icons'
import { useDebouncedCallback } from 'use-debounce'

const ICON_MAP: Record<FileIconName, React.ElementType> = {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText, File,
}

interface SearchResult {
  id: string
  title: string
  resourceType: string
  organization: string
  mimeType?: string | null
  originalFilename?: string | null
  hasFile: boolean
  externalLink?: string | null
}

export default function CommandSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const search = useDebouncedCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/v2/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, 200)

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(`/resources/${result.id}`)
  }, [router])

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground h-9 px-3 hidden md:flex"
        aria-label="Search resources"
      >
        <MagnifyingGlass className="h-4 w-4" />
        <span className="text-sm">Search...</span>
        <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="h-9 w-9 md:hidden"
        aria-label="Search"
      >
        <MagnifyingGlass className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search resources..."
          value={query}
          onValueChange={q => { setQuery(q); search(q) }}
        />
        <CommandList>
          {query.length < 2 ? (
            <CommandEmpty className="text-muted-foreground">Type to search resources</CommandEmpty>
          ) : loading ? (
            <CommandEmpty>Searching...</CommandEmpty>
          ) : results.length === 0 ? (
            <CommandEmpty>No results for &quot;{query}&quot;</CommandEmpty>
          ) : (
            <CommandGroup heading="Resources">
              {results.map(result => {
                const iconName = getFileIconName(result.mimeType, result.originalFilename)
                const Icon = result.hasFile ? ICON_MAP[iconName] : result.externalLink ? ArrowSquareOut : File
                const color = result.hasFile ? getFileIconColor(iconName) : 'text-muted-foreground'

                return (
                  <CommandItem
                    key={result.id}
                    value={result.title}
                    onSelect={() => handleSelect(result)}
                    className="gap-2"
                  >
                    <Icon weight="duotone" className={`h-4 w-4 shrink-0 ${color}`} />
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {result.resourceType} · {result.organization}
                      </span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
