'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import {
  Search, FileText, ChevronRight,
  Home, Archive, Users, UserCheck, ScrollText,
  Shield, Globe, Building2, Activity, Settings,
} from 'lucide-react'
import {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, File,
} from '@phosphor-icons/react'
import { getFileIconName, getFileIconColor, type FileIconName } from '@/lib/file-icons'
import { useDebouncedCallback } from 'use-debounce'

const FILE_ICON_MAP: Record<FileIconName, React.ElementType> = {
  FilePdf, FileDoc, FileXls, FilePpt, FileZip,
  FileImage, FileVideo, FileAudio, FileCsv, FileText, File,
}

interface NavPage {
  id: string
  title: string
  subtitle: string
  href: string
  icon: React.ElementType
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

const NAV_PAGES: NavPage[] = [
  { id: 'home', title: 'Resources', subtitle: 'Browse all resources', href: '/', icon: Home },
  { id: 'profile', title: 'Profile Settings', subtitle: 'Account and password', href: '/profile', icon: Settings },
  { id: 'approvals', title: 'Pending Approvals', subtitle: 'Review new users', href: '/admin/approvals', icon: UserCheck },
  { id: 'org-users', title: 'Org Users', subtitle: 'Manage your organization’s users', href: '/admin/org-users', icon: Users },
  { id: 'users', title: 'Manage Users', subtitle: 'All platform users', href: '/admin/users', icon: Shield },
  { id: 'org-health', title: 'Org Health', subtitle: 'Engagement metrics', href: '/admin/org-health', icon: Activity },
  { id: 'audit', title: 'Audit Log', subtitle: 'Activity history', href: '/admin/audit', icon: ScrollText },
]

function ResultIcon({ result }: { result: SearchResult }) {
  const iconName = getFileIconName(result.mimeType, result.originalFilename)
  const Icon = result.hasFile ? FILE_ICON_MAP[iconName] : result.externalLink ? Globe : FileText
  const color = result.hasFile ? getFileIconColor(iconName) : 'text-muted-foreground'
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background shrink-0">
      <Icon className={`h-4 w-4 ${color}`} weight="duotone" />
    </div>
  )
}

function NavIcon({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export default function CommandSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

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
    if (q.length < 2) { setResults([]); setIsSearching(false); return }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/v2/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setIsSearching(false)
    }
  }, 200)

  const handleValueChange = (q: string) => {
    setQuery(q)
    if (q.length >= 2) {
      setIsSearching(true)
    } else {
      setResults([])
      setIsSearching(false)
    }
    search(q)
  }

  const navigate = useCallback((href: string) => {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(href)
  }, [router])

  const filteredPages = query.length > 0
    ? NAV_PAGES.filter(p =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : []

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-black/5 transition-colors"
        aria-label="Search"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Search anything</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground md:flex">
          <span className="text-xs">{isMac ? '⌘' : 'Ctrl'}</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search resources, pages..."
          value={query}
          onValueChange={handleValueChange}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? 'Searching...' : query.length >= 2 ? 'No results found.' : 'Type to search...'}
          </CommandEmpty>

          {filteredPages.length > 0 && (
            <CommandGroup heading="Pages">
              {filteredPages.map(page => (
                <CommandItem
                  key={page.id}
                  value={page.title}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <NavIcon icon={page.icon} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">{page.title}</span>
                    <span className="text-xs text-muted-foreground">{page.subtitle}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.length > 0 && (
            <>
              {filteredPages.length > 0 && <CommandSeparator />}
              <CommandGroup heading="Resources">
                {results.map(result => (
                  <CommandItem
                    key={result.id}
                    value={`${result.title} ${result.organization}`}
                    onSelect={() => navigate(`/resources/${result.id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <ResultIcon result={result} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-medium truncate">{result.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {result.resourceType} · {result.organization}
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!query && (
            <CommandGroup heading="Quick Navigation">
              {NAV_PAGES.slice(0, 6).map(page => (
                <CommandItem
                  key={page.id}
                  value={page.title}
                  onSelect={() => navigate(page.href)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <NavIcon icon={page.icon} />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium">{page.title}</span>
                    <span className="text-xs text-muted-foreground">{page.subtitle}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
