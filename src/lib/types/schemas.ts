import { z } from 'zod';

const booleanIsh = z.union([
  z.boolean(),
  z.literal(0),
  z.literal(1),
]);

export const AuthorDetailsSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().optional(),
  orcid_id: z.string().optional(),
});

export const RelatedMaterialSchema = z.object({
  id: z.number().optional(),
  identifier: z.string().optional(),
  title: z.string().optional(),
  relation: z.enum([
    'IsCitedBy', 'Cites', 'IsSupplementTo', 'IsSupplementedBy', 'IsContinuedBy',
    'Continues', 'Describes', 'IsDescribedBy', 'HasMetadata', 'IsMetadataFor',
    'HasVersion', 'IsVersionOf', 'IsNewVersionOf', 'IsPreviousVersionOf',
    'IsPartOf', 'HasPart', 'IsPublishedIn', 'IsReferencedBy', 'References',
    'IsDocumentedBy', 'Documents', 'IsCompiledBy', 'Compiles', 'IsVariantFormOf',
    'IsOriginalFormOf', 'IsIdenticalTo', 'IsReviewedBy', 'Reviews',
    'IsDerivedFrom', 'IsSourceOf', 'IsRequiredBy', 'Requires', 'IsObsoletedBy',
    'Obsoletes',
  ]).optional(),
  identifier_type: z.enum([
    'ARK', 'arXiv', 'bibcode', 'DOI', 'EAN13', 'EISSN', 'Handle', 'IGSN',
    'ISBN', 'ISSN', 'ISTC', 'LISSN', 'LSID', 'PMID', 'PURL', 'UPC',
    'URL', 'URN', 'w3id',
  ]).optional(),
  is_linkout: booleanIsh.optional(),
  link: z.string().optional(),
});

export const FundingCreateSchema = z.object({
  id: z.number().optional(),
  title: z.string().optional(),
});
