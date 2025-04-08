// ChatGPT generated from FigShare's Swagger 2.0 API documentation

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

/** Represents a file associated with a FigShare item. */
export interface FigshareFile {
  /** Unique identifier for the file. */
  id: number;
  /** Name of the file. */
  name: string;
  /** Size of the file in bytes. */
  size: number;
  /** URL to download the file. */
  download_url: string;
  /** MD5 checksum provided for the file. */
  supplied_md5: string;
  /** Computed MD5 checksum of the file. */
  computed_md5: string;
  /** MIME type of the file. */
  mimetype: string;
}
