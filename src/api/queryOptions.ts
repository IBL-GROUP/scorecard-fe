/** Per-call options shared by every data hook in src/api. */
export interface QueryOptions {
  /**
   * Pass `false` to hold the request — e.g. for a tab the user holds no
   * permission on. Defaults to true.
   */
  enabled?: boolean;
}
