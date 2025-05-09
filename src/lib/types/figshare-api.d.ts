// ChatGPT generated from FigShare's Swagger 2.0 API documentation
import { z } from 'zod';
import {AuthorDetailsSchema, FundingCreateSchema, RelatedMaterialSchema} from "@/lib/types/schemas";

/** Represents a user in the FigShare system. */
export interface FigshareUser {
  /** Unique identifier for the user. */
  id: number;
  /** First name of the user. */
  first_name: string;
  /** Last name of the user. */
  last_name: string;
  /** URL-friendly name of the user. */
  url_name: string;
  /** User's email **/
  email: string;
  /** ORCID identifier of the user. */
  orcid_id: string | null;
  /** Indicates if the user is active. */
  is_active: boolean;
  quota: number;
  used_quota: number;
  institution_id: number;
}

export interface FigshareGroup {
  id: number;
  name: string;
  resource_id: string;
  parent_id: number|null;
  association_criteria: string;
}

export interface FigshareCustomField {
  id: number;
  name: string;
  field_type: |
      "text" |
      "textarea" |
      "dropdown" |
      "url" |
      "email"|
      "date" |
      "dropdown_large_list";
  settings?: object;
  is_mandatory?: boolean;
}

export interface FigshareArticleSearch {
  resource_id?: string;
  resource_doi?: string;
  item_type?: number;
  doi?: string;
  handle?: string;
  project_id?: number;
  order?: string;
  search_for?: string;
  page?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
  order_direction?: string;
  institution?: number;
  published_since?: string;
  modified_since?: string;
  group?: number;
}

export interface FigshareArticle {
  id: number;
  title: string;
  description: string;
  doi: string;
  url: string;
  created_date: string;
  modified_date: string;
  published_date: string;
  status: string;
  group_id?: number;
  custom_fields?: FigshareCustomField[];
}

type TimelineUpdate = never

export type CustomArticleFieldAdd = {
  name: string,
  value: string
}

export type AuthorDetails = z.infer<typeof AuthorDetailsSchema>;
export type RelatedMaterial = z.infer<typeof RelatedMaterialSchema>;
export type FundingCreate = z.infer<typeof FundingCreateSchema>;

export interface FigshareArticleCreate {
  /** Title of article */
  title: string;
  /** The article description. In a publisher case, usually this is the remote article description */
  description?: string;
  /** True if article has no files */
  is_metadata_record?: boolean;
  /** Article metadata reason */
  metadata_reason?: string;
  /** List of tags to be associated with the article. Keywords can be used instead */
  tags?: string[];
  /** List of tags to be associated with the article. Tags can be used instead */
  keywords?: string[];
  /** List of links to be associated with the article (e.g ["http://link1", "http://link2"]) */
  references?: string[];
  /** List of related materials; supersedes references and resource DOI/title. */
  related_materials?: RelatedMaterial[];
  /** List of category ids to be associated with the article (e.g [1, 23, 33]) */
  categories?: number[];
  /** List of category source ids to be associated with the article, supersedes the categories property */
  categories_by_source_id?: string[];
  /** List of authors to be associated with the article. The list can contain the following fields:
   * id, name, first_name, last_name, email, orcid_id.
   * If an id is supplied, it takes priority. For adding more authors use the specific authors endpoint.
   */
  authors?: AuthorDetails[];
  /** List of key, value pairs to be associated with the article */
  custom_fields?: Record<string, string>;
  /** List of custom field values, supersedes custom_fields parameter */
  custom_fields_list?: CustomArticleFieldAdd[];
  /** One of: figure, online resource, preprint, book, conference contribution,
   * media, dataset, poster, journal contribution, presentation, thesis, software
   */
  defined_type?: string;
  /** Grant number or funding authority */
  funding?: string;
  /** Funding creation / update items */
  funding_list?: FundingCreate[];
  /** License id for this article */
  license?: number;
  /** Not applicable for regular users. For institutional users only via support */
  doi?: string;
  /** Not applicable for regular users. For institutional users only via support */
  handle?: string;
  /** Deprecated by related materials. Publisher article DOI */
  resource_doi?: string;
  /** Deprecated by related materials. Publisher article title */
  resource_title?: string;
  /** Various timeline dates */
  timeline?: TimelineUpdate;
  /** Reserved for institutions/publishers with access to assign specific groups */
  group_id?: number;
}

export interface FigshareArticleCreateResponse {
  entity_id: number;
  location: string;
  warnings: string[];
}

export interface FigshareLicense {
  value: number;
  name: string;
  url: string;
}

export interface FigshareCategory {
  parent_id: number;
  id: number;
  title: string;
  path: string;
  source_id: string;
  taxonomy_id: number;
}

export interface FigshareItemType {
  id: number;
  name: string;
  string_id: string;
  icon: string;
  public_description: string;
  is_selectable: boolean;
  url_name: string;
}

export interface FigshareCreateFile {
  location: string;
}

export interface FigshareInitiateUpload {
  upload_token: string;
  upload_url: string;
  status: string;
  preview_state: string;
  viewer_type: string;
  is_attached_to_public_version: boolean;
  id: number;
  name: string;
  size: number;
  is_link_only: boolean;
  download_url: string;
  supplied_md5: string;
  computed_md5: string;
  mimetype?: string;
}

export interface FigshareUploadStart {
  token: string;
  name: string;
  size: number,
  md5: string;  // as provided on upload creation
  status: "PENDING"|"COMPLETED"|"ABORTED";
  parts: FigshareFilePart[]
}

/** Represents a file associated with a FigShare item. */
export interface FigshareFilePart {
  partNo: number;
  startOffset: number;
  endOffset: number;
  status: "PENDING"|"COMPLETE";
  locked: boolean;
}
