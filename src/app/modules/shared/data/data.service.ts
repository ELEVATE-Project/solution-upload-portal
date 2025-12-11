import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public baseUrl: string = environment.baseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Helper to convert a plain headers object to HttpHeaders (if provided).
   */
  private toHttpHeaders(headersObj?: any): HttpHeaders | undefined {
    if (!headersObj) {
      return undefined;
    }
    // If it's already an HttpHeaders instance, return it unchanged
    if (headersObj instanceof HttpHeaders) {
      return headersObj;
    }
    return new HttpHeaders(headersObj);
  }

  /**
   * POST wrapper
   * - returns the response body (not the full HttpResponse)
   * - logs and rethrows errors via throwError so callers get a meaningful error object
   */
  post<T = any>(requestParam: { url: string; data?: any; headers?: any }): Observable<T> {
    const url = this.baseUrl + requestParam.url;
    const headers = this.toHttpHeaders(requestParam?.headers);

    return this.http.post<T>(url, requestParam.data ?? null, { headers }).pipe(
      tap((resp) => console.log('[DataService] POST', url, resp)),
      map((body: any) => body),
      catchError((err) => {
        console.error('[DataService] POST error', { url, requestParam, err });
        return throwError(() => err || new Error('Unknown POST error'));
      })
    );
  }

  /**
   * GET wrapper
   * - returns the response body (not the full HttpResponse)
   * - accepts optional HttpParams
   * - logs and rethrows errors via throwError so callers get a meaningful error object
   */
  get<T = any>(requestParam: { url: string; headers?: any }, params?: HttpParams): Observable<T> {
    const url = this.baseUrl + requestParam.url;
    const headers = this.toHttpHeaders(requestParam?.headers);

    return this.http.get<T>(url, { params, headers }).pipe(
      tap((resp) => console.log('[DataService] GET', url, resp)),
      map((body: any) => body),
      catchError((err) => {
        console.error('[DataService] GET error', { url, requestParam, err });
        return throwError(() => err || new Error('Unknown GET error'));
      })
    );
  }

  /**
   * If you ever need to examine HTTP status/headers in the service and decide behavior
   * based on them, consider using `observe: 'response'` and handling HttpResponse<T>.
   * Example (not used by default above):
   *
   * return this.http.get<T>(url, { params, headers, observe: 'response' as const })
   *   .pipe(
   *     map((resp: HttpResponse<T>) => {
   *       if (resp.status !== 200) {
   *         throw { status: resp.status, body: resp.body };
   *       }
   *       return resp.body as T;
   *     }),
   *     catchError(...)
   *   );
   */
}
