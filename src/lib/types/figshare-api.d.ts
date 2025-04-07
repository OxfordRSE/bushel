// ChatGPT generated from FigShare's Swagger 2.0 API documentation

/** Represents a user in the FigShare system. */
export interface FigshareUser {
  /** Unique identifier for the user. */
  id: number;
  /** Full name of the user. */
  full_name: string;
  /** First name of the user. */
  first_name: string;
  /** Last name of the user. */
  last_name: string;
  /** URL-friendly name of the user. */
  url_name: string;
  /** ORCID identifier of the user. */
  orcid_id: string | null;
  /** Indicates if the user is active. */
  is_active: boolean;
}

/** Represents a project in FigShare. */
export interface FigshareProject {
  /** Unique identifier for the project. */
  id: number;
  /** Title of the project. */
  title: string;
  /** Description of the project. */
  description: string;
  /** Date when the project was created. */
  created_date: string;
  /** Date when the project was last modified. */
  modified_date: string;
  /** Indicates if the project is public. */
  is_public: boolean;
  /** List of users associated with the project. */
  users: FigshareUser[];
}

/** Represents an item (or article) in FigShare. */
export interface FigshareItem {
  /** Unique identifier for the item. */
  id: number;
  /** Title of the item. */
  title: string;
  /** Description of the item. */
  description: string;
  /** DOI of the item. */
  doi: string;
  /** URL to access the item. */
  url: string;
  /** Date when the item was published. */
  published_date: string;
  /** List of authors of the item. */
  authors: FigshareUser[];
  /** List of files associated with the item. */
  files: FigshareFile[];
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
