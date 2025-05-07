import { http, HttpResponse } from 'msw'
import {
  FigshareUser,
  FigshareGroup,
  FigshareCustomField, FigshareArticle, FigshareLicense, FigshareCategory, FigshareItemType
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
    quota: 100000,
    used_quota: 1000
  },
  {
    id: 2,
    first_name: 'Jane Mary Elizabeth Ruth',
    last_name: "Doe-Re-Mi-Fa-Sol-La-Ti-Do-And-Then-It's-Back-To-Doe",
    url_name: 'jane-doe',
    email: 'jane.doe@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
    quota: 100000,
    used_quota: 1000
  },
  {
    id: 3,
    first_name: 'John',
    last_name: 'Smith',
    url_name: 'john-smith',
    email: 'john.smith@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
    quota: 100000,
    used_quota: 1000
  },
  {
    id: 4,
    first_name: 'Full',
    last_name: 'Quota User',
    url_name: 'full-quota-user',
    email: 'full.quota.user@bodleian.ox.ac.uk',
    orcid_id: null,
    is_active: true,
    quota: 100000,
    used_quota: 100000
  },
  ...((n) => {
    return Array.from({ length: n }, (_, i) => ({
      id: 100 + i,
      first_name: `User`,
      last_name: `${i + 1}`,
      url_name: `user-${i + 1}`,
      email: `user.${i + 1}@example.com`,
      orcid_id: null,
      is_active: Math.random() > 0.05,
      quota: 100000,
      used_quota: Math.min(100000, Math.floor(Math.random() * 130000)),
    }))
  })(10000)
]

export const groups: FigshareGroup[] = [
  {
    id: 0,
    name: "SDS Test Group",
    resource_id: "res-0",
    parent_id: null,
    association_criteria: "Testing genuine uploads",
  },
  ...Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: i === 0 ? 'Iron Age Ceramics' : groupName(),
    resource_id: `res-${i + 1}`,
    parent_id: null,
    association_criteria: 'All members welcome',
  }))
];

export const customFields: FigshareCustomField[] = [
  // 7 fields for group 0 (SDS Test Group)
  {
    id: 100001,
    name: 'author details',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100002,
    name: 'genre',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100003,
    name: 'setting',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100004,
    name: 'location',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100005,
    name: 'participants',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100006,
    name: 'date',
    field_type: 'date' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
  {
    id: 100007,
    name: 'Copyright and Attribution',
    field_type: 'text' as FigshareCustomField['field_type'],
    is_mandatory: false,
  },
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
  {
    id: 0,
    title: 'Earthquake',
    description: 'A comprehensive study of Iron Age pottery.',
    doi: '10.1234/iron-age-pottery',
    url: 'https://figshare.com/articles/iron-age-pottery-analysis',
    created_date: '2023-01-01T00:00:00Z',
    modified_date: '2023-01-01T00:00:00Z',
    published_date: '2023-01-02T00:00:00Z',
    status: 'public',
    group_id: 0,
  },
  {
    id: 1,
    title: 'Cape_Koma',
    description: 'A comprehensive study of Iron Age pottery.',
    doi: '10.1234/iron-age-pottery',
    url: 'https://figshare.com/articles/iron-age-pottery-analysis',
    created_date: '2023-01-01T00:00:00Z',
    modified_date: '2023-01-01T00:00:00Z',
    published_date: '2023-01-02T00:00:00Z',
    status: 'public',
    group_id: 0,
  },
  // 100000 articles for group 1
  ...Array.from({ length: 100000 }, (_, i) => ({
    id: i + 2,
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
      id: 110000 + i,
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

const licenses: FigshareLicense[] = [
  {
    "value": 1,
    "name": "CC BY 4.0",
    "url": "https://creativecommons.org/licenses/by/4.0/"
  },
  {
    "value": 43,
    "name": "In Copyright",
    "url": "http://rightsstatements.org/vocab/InC/1.0/"
  },
  {
    "value": 12,
    "name": "CC BY-NC-ND 4.0",
    "url": "https://creativecommons.org/licenses/by-nc-nd/4.0/"
  },
  {
    "value": 11,
    "name": "CC BY-NC-SA 4.0",
    "url": "https://creativecommons.org/licenses/by-nc-sa/4.0/"
  },
  {
    "value": 10,
    "name": "CC BY-NC 4.0",
    "url": "https://creativecommons.org/licenses/by-nc/4.0/"
  },
  {
    "value": 9,
    "name": "CC BY-ND 4.0",
    "url": "https://creativecommons.org/licenses/by-nd/4.0/"
  },
  {
    "value": 8,
    "name": "CC BY-SA 4.0",
    "url": "https://creativecommons.org/licenses/by-sa/4.0/"
  },
  {
    "value": 7,
    "name": "Apache 2.0",
    "url": "https://www.apache.org/licenses/LICENSE-2.0.html"
  },
  {
    "value": 6,
    "name": "GPL 3.0+",
    "url": "https://www.gnu.org/licenses/gpl-3.0.html"
  },
  {
    "value": 5,
    "name": "GPL 2.0+",
    "url": "https://www.gnu.org/licenses/gpl-2.0.html"
  },
  {
    "value": 4,
    "name": "GPL",
    "url": "https://www.gnu.org/copyleft/gpl.html"
  },
  {
    "value": 3,
    "name": "MIT",
    "url": "https://opensource.org/licenses/MIT"
  },
  {
    "value": 2,
    "name": "CC0",
    "url": "https://creativecommons.org/publicdomain/zero/1.0/"
  },
  {
    "value": 163,
    "name": "JJC copyright and permissions",
    "url": "https://jamesjoycecorrespondence.org/FM_04.xml?tab=0"
  }
]

const categories: FigshareCategory[] = [
  {
    "parent_id": 1,
    "id": 11,
    "title": "Historical",
    "path": "/450/1024/6532",
    "source_id": "300204",
    "taxonomy_id": 4
  },
  {
    "parent_id": 1,
    "id": 12,
    "title": "comparative and typological linguistics",
    "path": "/450/1024/6533",
    "source_id": "300205",
    "taxonomy_id": 4
  },
  {
    "parent_id": 1,
    "id": 13,
    "title": "Linguistic anthropology",
    "path": "/450/1024/6534",
    "source_id": "300206",
    "taxonomy_id": 4
  }
]

const itemTypes: FigshareItemType[] = [
  {
    "id": 1,
    "name": "figure",
    "string_id": "figure",
    "icon": "figure",
    "public_description": "Figures are generally photos, graphs and static images that would be represented in traditional pdf publications.",
    "is_selectable": true,
    "url_name": "figure"
  },
  {
    "id": 2,
    "name": "media",
    "string_id": "media",
    "icon": "media",
    "public_description": "Media is any form of research output that is recorded and played. This is most commonly video, but can be audio or 3D representations.",
    "is_selectable": true,
    "url_name": "media"
  },
  {
    "id": 3,
    "name": "dataset",
    "string_id": "dataset",
    "icon": "dataset",
    "public_description": "Datasets usually provide raw data for analysis. This raw data often comes in spreadsheet form, but can be any collection of data, on which analysis can be performed.",
    "is_selectable": true,
    "url_name": "dataset"
  },
  {
    "id": 5,
    "name": "poster",
    "string_id": "poster",
    "icon": "poster",
    "public_description": "Poster sessions are particularly prominent at academic conferences. Posters are usually one frame of a powerpoint (or similar) presentation and are represented at full resolution to make them zoomable.",
    "is_selectable": true,
    "url_name": "poster"
  },
  {
    "id": 6,
    "name": "journal contribution",
    "string_id": "journal_contribution",
    "icon": "paper",
    "public_description": "Any type of content formally published in an academic journal, usually following a peer-review process.",
    "is_selectable": true,
    "url_name": "journal_contribution"
  },
  {
    "id": 7,
    "name": "presentation",
    "string_id": "presentation",
    "icon": "presentation",
    "public_description": "Academic presentations can be uploaded in their original slide format. Presentations are usually represented as slide decks. Videos of presentations can be uploaded as media.",
    "is_selectable": true,
    "url_name": "presentation"
  },
  {
    "id": 8,
    "name": "thesis",
    "string_id": "thesis",
    "icon": "thesis",
    "public_description": "In order to distinguish essays and pre-prints from academic theses, we have a separate category. These are often much longer text based documents than a paper.",
    "is_selectable": true,
    "url_name": "thesis"
  },
  {
    "id": 9,
    "name": "software",
    "string_id": "code",
    "icon": "code",
    "public_description": "Code as a research output can either be uploaded directly from your computer or through the code management system GitHub. Versioning of code repositories is supported.",
    "is_selectable": true,
    "url_name": "software"
  },
  {
    "id": 11,
    "name": "online resource",
    "string_id": "online_resource",
    "icon": "onlineresource",
    "public_description": "Any type of resource available online.",
    "is_selectable": true,
    "url_name": "online_resource"
  },
  {
    "id": 12,
    "name": "preprint",
    "string_id": "preprint",
    "icon": "preprint",
    "public_description": "Preprints are manuscripts made publicly available before they have been submitted for formal peer review and publication. They might contain new research findings or data. Preprints can be a draft or final version of an author's research but must not have been accepted for publication at the time of submission.",
    "is_selectable": true,
    "url_name": "preprint"
  },
  {
    "id": 13,
    "name": "book",
    "string_id": "book",
    "icon": "book",
    "public_description": "Books are generally long-form documents, a specialist work of writing that contains multiple chapters or a detailed written study.",
    "is_selectable": true,
    "url_name": "book"
  },
  {
    "id": 14,
    "name": "conference contribution",
    "string_id": "conference_contribution",
    "icon": "paper",
    "public_description": "Any type of content contributed to an academic conference, such as papers, presentations, lectures or proceedings.",
    "is_selectable": true,
    "url_name": "conference_contribution"
  },
  {
    "id": 15,
    "name": "report",
    "string_id": "report",
    "icon": "report",
    "public_description": "Reports are usually a detailed account of a research project, often including findings, analysis and conclusions.",
    "is_selectable": true,
    "url_name": "report"
  },
  {
    "id": 16,
    "name": "education resource",
    "string_id": "education_resource",
    "icon": "educationresource",
    "public_description": "Any type of resource used for educational purposes.",
    "is_selectable": true,
    "url_name": "education_resource"
  }
]

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
    const groupId = Number(url.searchParams.get("group_id"));
    const filteredFields = groupId === groups[0].id
        ? customFields.filter(field => field.id > 100000) // Only fields for group 0
        : groupId === 1
            ? customFields.slice(0, 100)
            // This filter means Group 2 will pick up fields for group 2, 20..29, 200..299, etc.
            : customFields.filter(field => /^Group\d+_Field\d+$/.test(field.name) && field.name.startsWith(`Group${groupId}`));
    console.debug(`Filtered fields for group ${groupId}:`, filteredFields);
    return HttpResponse.json(filteredFields);
  }),

  http.get('https://api.figshare.com/v2/account/articles', ({ request }) => {
    // Simulate pagination
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset')) || 0;
    const limit = Number(url.searchParams.get('limit')) || 10;
    const paginatedArticles = articles.slice(offset, offset + limit);
    return HttpResponse.json(paginatedArticles)
  }),

  http.get('https://api.figshare.com/v2/articles', ({request}) => {
    // Simulate pagination
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset')) || 0;
    const limit = Number(url.searchParams.get('limit')) || 10;
    const groupId = Number(url.searchParams.get('group_id'));
    const groupArticles = articles.filter(article => article.group_id === groupId);
    const paginatedArticles = groupArticles.slice(offset, offset + limit);
    return HttpResponse.json(paginatedArticles)
  }),

  http.post('https://api.figshare.com/v2/account/articles', async ({request}) => {
    const body = (await request.json()) as Partial<FigshareArticle>;
    if (!body?.title) return HttpResponse.json({message: "Title is required"}, {status: 400})
    const id = 900000 + Math.floor(Math.random() * 100000)
    const now = new Date().toUTCString();
    return HttpResponse.json({
      id,
      title: body.title,
      description: body.description ?? '',
      doi: `10.5678/${id}`,
      url: `https://figshare.com/articles/${id}`,
      created_date: now,
      modified_date: now,
      published_date: now,
      status: 'draft',
      group_id: body.group_id,
    }, {status: 201});
  }),

  http.get('https://api.figshare.com/v2/account/licenses', () => {
    return HttpResponse.json(licenses);
  }),

  http.get('https://api.figshare.com/v2/account/categories', () => {
    return HttpResponse.json(categories);
  }),

  http.get('https://api.figshare.com/v2/item_types', ({request}) => {
    const url = new URL(request.url);
    const group_id = Number(url.searchParams.get("group_id"));
    return group_id === groups[0].id
        ? HttpResponse.json(itemTypes)
        : HttpResponse.json(itemTypes.slice(2));
  }),

  // Initiate file upload (POST /account/articles/:articleId/files)
  http.post('https://api.figshare.com/v2/account/articles/:articleId/files', async () => {
    const randomId = Math.floor(Math.random() * 1000000);
    return HttpResponse.json({
          location: `https://upload.figshare.com/upload/${randomId}`,
          id: randomId,
        },
        { status: 201 }
    );
  }),

  // Fetch parts info (GET /upload/:uploadToken)
  http.get('https://upload.figshare.com/upload/:uploadToken', async (req) => {
    return HttpResponse.json({
      token: req.params.uploadToken,
      name: 'mockfile.txt',
      size: 123456,
      md5: 'mockedmd5hash',
      status: 'PENDING',
      parts: Array.from({ length: 3 }).map((_, idx) => ({
        partNo: idx + 1,
        startOffset: idx * 4096,
        endOffset: (idx + 1) * 4096 - 1,
        status: 'PENDING',
        locked: false,
      })),
    });
  }),

  // Upload file part (PUT /upload/:uploadToken/:partNo)
  http.put('https://upload.figshare.com/upload/:uploadToken/:partNo', async () => {
    const wait = new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    await wait;
    return HttpResponse.json();
  }),

  // Complete file upload (POST /account/articles/:articleId/files/:fileId)
  http.post('https://api.figshare.com/v2/account/articles/:articleId/files/:fileId', async () => {
    return HttpResponse.json();
  }),
]
