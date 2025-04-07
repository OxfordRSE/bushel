import { http, HttpResponse } from 'msw'
import { FigshareUser, FigshareProject, FigshareItem, FigshareFile } from '@/lib/types/figshare-api'

// Shared mock data
const mockUser: FigshareUser = {
  id: 1,
  full_name: 'Mock User',
  first_name: 'Mock',
  last_name: 'User',
  url_name: 'mock-user',
  orcid_id: null,
  is_active: true,
}

const mockProjects: FigshareProject[] = [
  {
    id: 101,
    title: 'Iron Age Sites',
    description: 'Survey and excavation results from Iron Age settlements.',
    created_date: '2023-06-15T12:00:00Z',
    modified_date: '2023-12-20T10:15:00Z',
    is_public: false,
    users: [mockUser],
  },
  {
    id: 102,
    title: 'Bronze Pottery Analysis',
    description: 'Microscopic and chemical analysis of Bronze Age pottery.',
    created_date: '2023-07-01T09:30:00Z',
    modified_date: '2023-11-02T14:20:00Z',
    is_public: true,
    users: [mockUser],
  },
]

const mockItems: FigshareItem[] = [
  {
    id: 201,
    title: 'Mid-European Trade Routes',
    description: 'Analysis of trade patterns across Europe.',
    doi: '10.1234/figshare.201',
    url: 'https://figshare.com/articles/201',
    published_date: '2024-01-01T00:00:00Z',
    authors: [mockUser],
    files: [],
  },
  {
    id: 202,
    title: 'Nascent "Silk Road" Trade',
    description: 'Early trade activity resembling the Silk Road.',
    doi: '10.1234/figshare.202',
    url: 'https://figshare.com/articles/202',
    published_date: '2024-01-15T00:00:00Z',
    authors: [mockUser],
    files: [],
  },
]

export const figshareHandlers = [
  http.post('https://figshare.com/account/applications/token', async ({ request }) => {
    const body = await request.text();
    const params = new URLSearchParams(body);

    // 👇 Simulate token exchange
    if (params.get('code') === 'mock-code') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
      });
    }

    return new HttpResponse('Invalid code', { status: 400 });
  }),

  http.get('https://api.figshare.com/v2/account', () => {
    return HttpResponse.json({
      id: 1,
      full_name: 'Mock User',
      first_name: 'Mock',
      last_name: 'User',
      url_name: 'mock-user',
      orcid_id: null,
      is_active: true,
    });
  }),

  http.get('https://api.figshare.com/v2/account', () => {
    return HttpResponse.json(mockUser)
  }),

  http.get('https://api.figshare.com/v2/account/projects', () => {
    return HttpResponse.json(mockProjects)
  }),

  http.get(
    'https://api.figshare.com/v2/account/projects/:projectId/articles',
    ({ params }) => {
      return HttpResponse.json(mockItems.filter(i => i.id % 2 === Number(params.projectId) % 2))
    }
  ),

  http.post(
    'https://api.figshare.com/v2/account/projects/:projectId/articles',
    async ({ request }) => {
      const body = await request.json() as {title: string, description?: string}
      const newId = Math.floor(Math.random() * 1000) + 300
      const newItem: FigshareItem = {
        id: newId,
        title: body.title,
        description: body.description ?? '',
        doi: `10.1234/figshare.${newId}`,
        url: `https://figshare.com/articles/${newId}`,
        published_date: '',
        authors: [mockUser],
        files: [],
      }
      return HttpResponse.json(newItem)
    }
  ),

  http.get('https://api.figshare.com/v2/account/articles/:articleId', ({ params }) => {
    const item = mockItems.find(i => i.id === Number(params.articleId)) ?? mockItems[0]
    return HttpResponse.json(item)
  }),

  http.post('https://api.figshare.com/v2/account/articles/:articleId/files', async () => {
    const newFile: FigshareFile = {
      id: 555,
      name: 'mock.xlsx',
      size: 23456,
      download_url: 'https://mock-figshare.com/files/mock.xlsx',
      supplied_md5: 'abc123def456',
      computed_md5: 'abc123def456',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    return HttpResponse.json(newFile)
  }),
]
