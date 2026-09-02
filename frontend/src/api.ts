export type TagCategory = 'fandom' | 'relationship' | 'character' | 'freeform'

export interface Tag {
  id: number
  name: string
  slug: string
  category?: TagCategory
  count?: number
}

export type StoryRating = 'not-rated' | 'general' | 'teen' | 'mature' | 'explicit'
export type StoryCategory = 'ff' | 'fm' | 'gen' | 'mm' | 'multi' | 'other'
export type StoryStatus = 'draft' | 'published'

export const RATING_LABELS: Record<StoryRating, string> = {
  'not-rated': 'Not Rated',
  general: 'General Audiences',
  teen: 'Teen',
  mature: 'Mature',
  explicit: 'Explicit',
}

export const CATEGORY_LABELS: Record<StoryCategory, string> = {
  ff: 'F/F',
  fm: 'F/M',
  gen: 'Gen',
  mm: 'M/M',
  multi: 'Multi',
  other: 'Other',
}

export const WARNING_OPTIONS = [
  'Graphic violence',
  'Major character death',
  'Sensitive themes',
  'No warnings apply',
] as const

export interface PublicUser {
  id: number
  fullName: string
  username: string
  bio: string
  avatarColor: string
  avatarUrl?: string
  bannerUrl?: string
  favoriteGenres?: string[]
}

export interface User extends PublicUser {
  email: string
  provider: string
  coins: number
  favoriteGenres: string[]
  blockedTags: string[]
  readerTheme: 'dark' | 'light' | 'sepia' | 'high-contrast'
  readerFontSize: 'sm' | 'md' | 'lg' | 'xl'
  readerFont: 'serif' | 'sans'
  uiScale: 'sm' | 'md' | 'lg' | 'xl'
  siteTheme: 'default' | 'contrast' | 'dusk' | 'cream'
  uiFont: 'sans' | 'serif' | 'dyslexic'
  reduceMotion: boolean
  notifyNewChapters: boolean
  notifyReplies: boolean
  notifyForum: boolean
  notifyTips: boolean
  emailDigest: boolean
}

export interface ProfileWork extends StorySummary {
  createdAt: string
}

export interface ProfileBookmark {
  id: number
  story: ProfileWork
  note: string
  isPublic: boolean
  createdAt: string
}

export interface PublicProfile {
  user: PublicUser
  storyCount: number
  totalChapters: number
  genres: string[]
  stories: ProfileWork[]
  bookmarkCount: number
  bookmarks: ProfileBookmark[]
  isOwnProfile: boolean
}

export interface Genre {
  name: string
  slug: string
  count: number
}

export interface StorySummary {
  id: number
  title: string
  description: string
  genre: string
  coverColor: string
  coverImageUrl?: string
  author: PublicUser
  coAuthors?: PublicUser[]
  tags: Tag[]
  chapterCount: number
  freeChapters: number
  paidChapters: number
  wordCount?: number
  createdAt?: string
  rating: StoryRating
  warnings: string[]
  categories: StoryCategory[]
  language: string
  status: StoryStatus
  complete: boolean
  commentsEnabled: boolean
  updatedAt?: string
}

export interface MyStorySummary extends StorySummary {
  totalChapters: number
  draftChapters: number
}

export interface ChapterPreview {
  id: number
  number: number
  title: string
  coinCost: number
  locked: boolean
  unlocked: boolean
}

export interface StoryDetail {
  id: number
  title: string
  description: string
  genre: string
  coverColor: string
  coverImageUrl?: string
  author: PublicUser
  coAuthors?: PublicUser[]
  tags: Tag[]
  chapters: ChapterPreview[]
  tipsEnabled: boolean
  tipTotal: number
  tipCount: number
  bookmarked: boolean
  bookmarkPublic: boolean
  bookmarkNote: string
  rating: StoryRating
  warnings: string[]
  categories: StoryCategory[]
  language: string
  status: StoryStatus
  complete: boolean
  commentsEnabled: boolean
  isOwner: boolean
  updatedAt?: string
}

export interface ChapterDetail {
  id: number
  storyId: number
  number: number
  title: string
  content?: string
  summary?: string
  notes?: string
  endNotes?: string
  coinCost: number
  locked: boolean
  publishedAt?: string | null
}

export interface StoryUpdatePayload {
  title?: string
  description?: string
  genre?: string
  coverColor?: string
  rating?: StoryRating
  warnings?: string[]
  categories?: StoryCategory[]
  language?: string
  status?: StoryStatus
  complete?: boolean
  commentsEnabled?: boolean
  coAuthors?: string[]
  tags?: { name: string; category: TagCategory }[]
}

export interface ChapterUpdatePayload {
  title?: string
  summary?: string
  notes?: string
  endNotes?: string
  content?: string
  published?: boolean
}

export interface CoinPack {
  id: string
  coins: number
  price: number
  label: string
  bonus: number
}

export interface StoryFilters {
  genre?: string
  excludeGenre?: string
  vip?: boolean
  tags?: string[]
  q?: string
}

export interface ProfileUpdate {
  fullName?: string
  username?: string
  bio?: string
  avatarColor?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  favoriteGenres?: string[]
  blockedTags?: string[]
  readerTheme?: User['readerTheme']
  readerFontSize?: User['readerFontSize']
  readerFont?: User['readerFont']
  uiScale?: User['uiScale']
  siteTheme?: User['siteTheme']
  uiFont?: User['uiFont']
  reduceMotion?: boolean
  notifyNewChapters?: boolean
  notifyReplies?: boolean
  notifyForum?: boolean
  notifyTips?: boolean
  emailDigest?: boolean
}

export interface ReadingHistoryEntry {
  storyId: number
  storyTitle: string
  coverColor: string
  authorName: string
  chapterNum: number
  chapterTitle: string
  updatedAt: string
}

export interface UnlockHistoryEntry {
  storyId: number
  storyTitle: string
  coverColor: string
  authorName: string
  chapterNum: number
  chapterTitle: string
  coinCost: number
  createdAt: string
}

export interface TipHistoryEntry {
  storyId: number
  storyTitle: string
  authorName: string
  amount: number
  message: string
  createdAt: string
}

export interface UserHistory {
  reading: ReadingHistoryEntry[]
  unlocks: UnlockHistoryEntry[]
  tips: TipHistoryEntry[]
}

export interface CommentUser {
  id: number
  fullName: string
  username: string
  avatarColor: string
  avatarUrl?: string
}

export interface StoryComment {
  id: number
  storyId: number
  body: string
  createdAt: string
  parentId?: number
  user: CommentUser
}

export interface LineComment {
  id: number
  chapterId: number
  paragraphIdx: number
  startOffset: number
  endOffset: number
  selectedText: string
  body: string
  createdAt: string
  user: CommentUser
}

export interface ForumCategory {
  id: number
  name: string
  slug: string
  description: string
  threadCount: number
}

export interface ForumThreadSummary {
  id: number
  title: string
  body: string
  createdAt: string
  updatedAt: string
  replyCount: number
  user: CommentUser
  category: { id: number; name: string; slug: string }
}

export interface ForumReply {
  id: number
  body: string
  createdAt: string
  parentId?: number
  user: CommentUser
}

export interface ForumThreadDetail {
  id: number
  title: string
  body: string
  createdAt: string
  updatedAt: string
  user: CommentUser
  category: { id: number; name: string; slug: string }
  replies: ForumReply[]
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function parseErrorText(text: string, fallback: string) {
  const raw = text.trim()
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as { error?: string; message?: string }
    if (parsed.error) return parsed.error
    if (parsed.message) return parsed.message
  } catch {
    // body is not JSON
  }
  return raw
}

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  if (err instanceof Error && err.message) return parseErrorText(err.message, fallback)
  return fallback
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorText(text, res.statusText))
  }

  return res.json()
}

async function uploadImage(path: string, field: string, file: File): Promise<User> {
  return uploadFile<User>(path, field, file)
}

async function uploadFile<T>(path: string, field: string, file: File): Promise<T> {
  const token = localStorage.getItem('token')
  const form = new FormData()
  form.append(field, file)
  const res = await fetch(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(parseErrorText(text, res.statusText))
  }
  return res.json()
}

function storyQuery(filters: StoryFilters = {}) {
  const params = new URLSearchParams()
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.excludeGenre) params.set('excludeGenre', filters.excludeGenre)
  if (filters.vip) params.set('vip', 'true')
  if (filters.q) params.set('q', filters.q)
  if (filters.tags?.length) params.set('tags', filters.tags.join(','))
  const qs = params.toString()
  return qs ? `/api/stories?${qs}` : '/api/stories'
}

export const api = {
  devLogin: (email: string, fullName?: string) =>
    request<{ token: string; user: User }>('/auth/dev', {
      method: 'POST',
      body: JSON.stringify({ email, fullName }),
    }),

  me: () => request<User>('/api/me'),

  updateProfile: (data: ProfileUpdate) =>
    request<User>('/api/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  uploadAvatar: async (file: File) => uploadImage('/api/me/avatar', 'avatar', file),

  uploadBanner: async (file: File) => uploadImage('/api/me/banner', 'banner', file),

  publicUser: (username: string) => request<PublicProfile>(`/api/users/${encodeURIComponent(username)}`),

  setBookmark: (storyId: number, data?: { note?: string; isPublic?: boolean }) =>
    request<{ bookmarked: boolean; bookmarkPublic: boolean; bookmarkNote: string }>(
      `/api/stories/${storyId}/bookmark`,
      { method: 'PUT', body: JSON.stringify(data ?? {}) },
    ),

  removeBookmark: (storyId: number) =>
    request<{ bookmarked: boolean }>(`/api/stories/${storyId}/bookmark`, { method: 'DELETE' }),

  userHistory: () => request<UserHistory>('/api/me/history'),

  genres: () => request<Genre[]>('/api/genres'),

  tags: () => request<Tag[]>('/api/tags'),

  stories: (filters?: StoryFilters) => request<StorySummary[]>(storyQuery(filters)),

  story: (id: number) => request<StoryDetail>(`/api/stories/${id}`),

  chapter: (storyId: number, num: number) =>
    request<ChapterDetail>(`/api/stories/${storyId}/chapters/${num}`),

  unlockChapter: (chapterId: number) =>
    request<{ message: string; coins: number }>(`/api/chapters/${chapterId}/unlock`, {
      method: 'POST',
    }),

  coinPacks: () => request<CoinPack[]>('/api/coins/packs'),

  purchaseCoins: (packId: string) =>
    request<{ coins: number; coinsAdded: number; message: string }>('/api/coins/purchase', {
      method: 'POST',
      body: JSON.stringify({ packId }),
    }),

  tipAmounts: () => request<number[]>('/api/tips/amounts'),

  tipAuthor: (storyId: number, amount: number, message?: string) =>
    request<{ message: string; coins: number; amount: number }>(`/api/stories/${storyId}/tip`, {
      method: 'POST',
      body: JSON.stringify({ amount, message, _hp: '' }),
    }),

  storyComments: (storyId: number) =>
    request<StoryComment[]>(`/api/stories/${storyId}/comments`),

  postStoryComment: (storyId: number, body: string, parentId?: number) =>
    request<StoryComment>(`/api/stories/${storyId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, parentId, _hp: '' }),
    }),

  lineComments: (chapterId: number) =>
    request<LineComment[]>(`/api/chapters/${chapterId}/line-comments`),

  postLineComment: (
    chapterId: number,
    data: {
      body: string
      paragraphIdx: number
      startOffset: number
      endOffset: number
      selectedText: string
    },
  ) =>
    request<LineComment>(`/api/chapters/${chapterId}/line-comments`, {
      method: 'POST',
      body: JSON.stringify({ ...data, _hp: '' }),
    }),

  myStories: () => request<MyStorySummary[]>('/api/me/stories'),

  createStory: (title?: string) =>
    request<{ id: number }>('/api/stories', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  updateStory: (id: number, payload: StoryUpdatePayload) =>
    request<{ id: number }>(`/api/stories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteStory: (id: number) =>
    request<{ deleted: boolean }>(`/api/stories/${id}`, { method: 'DELETE' }),

  uploadStoryCover: (id: number, file: File) =>
    uploadFile<{ coverImageUrl: string }>(`/api/stories/${id}/cover`, 'cover', file),

  createChapter: (storyId: number, title?: string) =>
    request<{ id: number; number: number }>(`/api/stories/${storyId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  chapterForEdit: (chapterId: number) => request<ChapterDetail>(`/api/chapters/${chapterId}/edit`),

  updateChapter: (chapterId: number, payload: ChapterUpdatePayload) =>
    request<{ id: number }>(`/api/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteChapter: (chapterId: number) =>
    request<{ deleted: boolean }>(`/api/chapters/${chapterId}`, { method: 'DELETE' }),

  reorderChapters: (storyId: number, chapterIds: number[]) =>
    request<{ reordered: boolean }>(`/api/stories/${storyId}/chapters/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ chapterIds }),
    }),

  tagSuggestions: (params: { category?: TagCategory; q?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.category) qs.set('category', params.category)
    if (params.q) qs.set('q', params.q)
    const suffix = qs.toString()
    return request<Tag[]>(`/api/tags${suffix ? `?${suffix}` : ''}`)
  },

  forumCategories: () => request<ForumCategory[]>('/api/forum/categories'),

  forumFeed: (sort: 'hot' | 'latest' = 'latest', limit = 10) =>
    request<ForumThreadSummary[]>(`/api/forum/feed?sort=${sort}&limit=${limit}`),

  forumThreads: (slug: string) =>
    request<ForumThreadSummary[]>(`/api/forum/categories/${slug}/threads`),

  forumThread: (id: number) => request<ForumThreadDetail>(`/api/forum/threads/${id}`),

  createForumThread: (categorySlug: string, title: string, body: string) =>
    request<{ id: number; title: string }>('/api/forum/threads', {
      method: 'POST',
      body: JSON.stringify({ categorySlug, title, body, _hp: '' }),
    }),

  postForumReply: (threadId: number, body: string, parentId?: number) =>
    request<ForumReply>(`/api/forum/threads/${threadId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ body, parentId, _hp: '' }),
    }),
}
