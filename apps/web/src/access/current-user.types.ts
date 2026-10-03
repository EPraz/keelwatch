export interface CurrentUser {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly correlationId?: string;
}

export type CurrentUserState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly user: CurrentUser }
  | {
      readonly status: 'error';
      readonly httpStatus?: number;
      readonly error: ApiErrorResponse;
    };
