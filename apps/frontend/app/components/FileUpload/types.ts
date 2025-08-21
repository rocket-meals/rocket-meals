export interface FileRelation {
	id: string;
	directus_files_id: string;
}

export interface FormAnswer {
	id: string;
	value_files: FileRelation[];
}
