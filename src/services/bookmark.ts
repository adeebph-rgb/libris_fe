import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { BACKEND_URL } from './auth.interceptor';

export interface Bookmark {
  id: number;
  book_id: number;
  page_number: number;
  note?: string;
  snippet?: string;
  created_at: string;
}
@Injectable({
  providedIn: 'root'
})
export class BookmarkService {
  constructor(private http: HttpClient) {}

  getBookmarks(bookId: number): Observable<Bookmark[]> {
    return this.http.get<Bookmark[]>(`${BACKEND_URL}/books/${bookId}/bookmarks`);
  }

  createBookmark(bookId: number, data: { page_number: number; note?: string; snippet?: string}):Observable<Bookmark>{
    return this.http.post<Bookmark>(`${BACKEND_URL}/books/${bookId}/bookmarks`,data);
  }

  updateBookmark(bookmarkId: number, data: { note: string}): Observable<Bookmark>{
    return this.http.put<Bookmark>(`${BACKEND_URL}/bookmarks/${bookmarkId}`, data);
  }

  deleteBookmark(bookmarkId: number): Observable<any>{
    return this.http.delete(`${BACKEND_URL}/bookmarks/${bookmarkId}`);
  }

}
