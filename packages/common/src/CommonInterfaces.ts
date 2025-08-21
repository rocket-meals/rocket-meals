/**
 * Common interfaces and types that can be shared across frontend and backend
 */

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'in'
  | 'nin'
  | 'null'
  | 'nnull'
  | 'contains'
  | 'ncontains'
  | 'icontains'
  | 'between'
  | 'nbetween'
  | 'empty'
  | 'nempty'
  | 'intersects'
  | 'nintersects'
  | 'intersects_bbox'
  | 'nintersects_bbox';

/**
 * Generic query interface that can be adapted by frontend and backend
 */
export interface BaseQuery<T> {
  fields?: (keyof T)[] | string[] | null;
  sort?: (keyof T)[] | string[] | null;
  filter?: any | null;
  deep?: Record<string, BaseQuery<T>> | null;
  limit?: number | null;
  offset?: number | null;
  page?: number | null;
}

/**
 * Aggregate query interface
 */
export interface BaseAggregateQuery<T> {
  aggregate?: {
    avg?: string[] | string;
    count?: string[] | string;
    sum?: string[] | string;
    min?: string[] | string;
    max?: string[] | string;
  };
  query?: BaseQuery<T>;
}

/**
 * Standard error response interface
 */
export interface ErrorResponse {
  message: string;
  code?: string | number;
  details?: any;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
 * Environment variable helper interface
 */
export interface IEnvironmentHelper {
  getEnvVariable(name: string): string | undefined;
  isInsideDocker(): boolean;
}

/**
 * Request options for customizing behavior
 */
export interface RequestOptions {
  disableEventEmit?: boolean;
  withTranslations?: boolean;
  limit?: number;
  fields?: string[];
}

/**
 * Collection helper configuration
 */
export interface CollectionHelperConfig {
  collection: string;
  enableCaching?: boolean;
  defaultLimit?: number;
  enableLogging?: boolean;
}