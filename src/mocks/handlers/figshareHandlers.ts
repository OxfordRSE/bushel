import { http, HttpResponse } from 'msw'
import {
  FigshareUser,
  FigshareGroup,
  FigshareCustomField, FigshareArticle, FigshareArticleSearch
} from '@/lib/types/figshare-api'

function groupName(): string {
  const eras = [
    'Iron Age',
    'Bronze Age',
    'Roman',
    'Neolithic',
    'Medieval',
    'Byzantine',
    'Hellenistic',
    'Viking',
    'Ptolemaic',
    'Chalcolithic',
  ];

  const features = [
    'Pottery',
    'Burial Rites',
    'Settlement Patterns',
    'Coin Hoards',
    'Trade Routes',
    'Textiles',
    'Tool Use',
    'Weaponry',
    'Art Styles',
    'Agricultural Practices',
  ];

  const era = eras[Math.floor(Math.random() * eras.length)];
  const feature = features[Math.floor(Math.random() * features.length)];
  return `${era} ${feature}`;
}

function articleTitle(n: number): string {
  const materials = ['Ceramic', 'Iron', 'Bronze', 'Glass', 'Stone', 'Wooden', 'Ivory'];
  const subjects = ['Pot', 'Coin', 'Amulet', 'Bowl', 'Figurine', 'Arrowhead', 'Sword'];
  const conditions = ['Fragment', 'Complete', 'Reconstruction', 'Shard', 'Sample', 'Impression'];

  const mat = materials[n % materials.length];
  const sub = subjects[Math.floor(n / 10) % subjects.length];
  const cond = conditions[Math.floor(n / 100) % conditions.length];

  return `${mat} ${sub} ${cond} #${n}`;
}



// Shared mock data
const users: FigshareUser[] = [
  {
    id: 1,
    first_name: 'Mock',
    last_name: 'User',
    url_name: 'mock-user',
    email: 'mock.user@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
  },
  {
    id: 2,
    first_name: 'Jane',
    last_name: 'Doe',
    url_name: 'jane-doe',
    email: 'jane.doe@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
  },
  {
    id: 3,
    first_name: 'John',
    last_name: 'Smith',
    url_name: 'john-smith',
    email: 'john.smith@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
  },
  ...((n) => {
    return Array.from({ length: n }, (_, i) => ({
      id: 100 + i,
      first_name: `User`,
      last_name: `${i + 1}`,
      url_name: `user-${i + 1}`,
      email: `user.${i + 1}@example.com`,
      orcid_id: null,
      is_active: Math.random() > 0.05
    }))
  })(10000)
]

export const groups: FigshareGroup[] = Array.from({ length: 1000 }, (_, i) => ({
  id: i + 1,
  name: i === 0 ? 'Iron Age Ceramics' : groupName(),
  resource_id: `res-${i + 1}`,
  parent_id: null,
  association_criteria: 'All members welcome',
}));

export const customFields: FigshareCustomField[] = [
  // 100 fields for group 1 (Iron Age Ceramics)
  ...Array.from({ length: 100 }, (_, i) => ({
    id: i + 1,
    name: `Field ${i + 1}`,
    field_type: (i % 7 === 0 ? 'textarea' : 'text') as FigshareCustomField['field_type'],
    is_mandatory: i % 3 === 0,
  })),

  // Small number of custom fields for some other groups
  ...Array.from({ length: 400 }, (_, i) => {
    const groupId = (i % 800) + 2; // skip group 1, spread among groups 2–801
    return {
      id: 101 + i,
      name: `Group${groupId}_Field${i % 5}`,
      field_type: 'text' as FigshareCustomField['field_type'],
      is_mandatory: false,
    };
  }),
];

export const articles: FigshareArticle[] = [
  // 100000 articles for group 1
  ...Array.from({ length: 100000 }, (_, i) => ({
    id: i + 1,
    title: articleTitle(i + 1),
    description: `Detailed analysis of item ${i + 1}.`,
    doi: `10.1234/shard.${i + 1}`,
    url: `https://figshare.com/articles/shard-${i + 1}`,
    created_date: '2023-01-01T00:00:00Z',
    modified_date: '2023-01-01T00:00:00Z',
    published_date: '2023-01-02T00:00:00Z',
    status: 'public',
    group_id: 1,
  })),

  // A few articles scattered in other groups
  ...Array.from({ length: 250 }, (_, i) => {
    const groupId = (i % 249) + 2; // skip group 1
    return {
      id: 100001 + i,
      title: articleTitle(i + 1),
      description: `Article ${i + 1} details findings in group ${groupId}.`,
      doi: `10.5678/group${groupId}.${i + 1}`,
      url: `https://figshare.com/articles/group${groupId}-${i + 1}`,
      created_date: '2022-12-01T00:00:00Z',
      modified_date: '2022-12-15T00:00:00Z',
      published_date: '2022-12-20T00:00:00Z',
      status: 'draft',
      group_id: groupId,
    };
  }),
];


export const figshareHandlers = [
  http.post('https://api.figshare.com/v2/token', async ({ request }) => {
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
    return HttpResponse.json(users[0]);
  }),

  http.get('https://api.figshare.com/v2/account/institution/accounts', ({request}) => {
    // Simulate pagination
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset')) || 0;
    const limit = Number(url.searchParams.get('limit')) || 10;
    const paginatedUsers = users.slice(offset, offset + limit);
    return HttpResponse.json(paginatedUsers);
  }),

  http.get('https://api.figshare.com/v2/account/institution/groups', () => {
    // No pagination
    return HttpResponse.json(groups);
  }),

  http.get('https://api.figshare.com/v2/account/institution/custom_fields', ({ request }) => {
    const url = new URL(request.url);
    const groupId = Number(url.searchParams.get("groupId"));
    // Simulate pagination
    const offset = Number(url.searchParams.get("offset")) || 0;
    const limit = Number(url.searchParams.get("limit")) || 10;
    const paginatedFields = customFields.filter(field => field.id === groupId).slice(offset, offset + limit);
    return HttpResponse.json(paginatedFields);
  }),

  http.post('https://api.figshare.com/v2/account/articles/search', ({ params }) => {
    const body = params as FigshareArticleSearch
    // Filter articles based on search criteria
    const filteredArticles = articles.filter(article => {
      if (body.search_for && !article.title.toLowerCase().includes(body.search_for.toLowerCase())) {
        return false
      }
      return !(body.group && article.group_id !== body.group);
    })
    // Paginate results
    const pageSize = body.page_size || 10
    const page = body.page || 1
    const offset = (page - 1) * pageSize
    const paginatedArticles = filteredArticles.slice(offset, offset + pageSize)
    return HttpResponse.json(paginatedArticles)
  }),

]
