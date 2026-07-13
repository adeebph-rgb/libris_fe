import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, tap } from 'rxjs';

export interface Book {
  title: string;
  authors: string[];
  cover: string;
  year: number | null;
  key: string;
  rating: number;
  status: string;
  editionCount?: number;
  languages?: string[];
  seriesName?: string;
  seriesPosition?: string;
  ebookAccess?: string;
  hasFulltext?: boolean;
  authorKeys?: string[];
  pagesRead?: number;
  totalPages?: number;
  dateStarted?: string;
  dateFinished?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookApi {

  private apiUrl = 'https://openlibrary.org/search.json';
  private worksUrl = 'https://openlibrary.org';

  private searchCache = new Map<string, Book[]>();
  private detailsCache = new Map<string, any>();

  constructor(private http: HttpClient) {}

  searchBooks(query: string): Observable<Book[]> {
    if (this.searchCache.has(query)) {
      return of(this.searchCache.get(query)!);
    }

    return this.http
      .get<any>(`${this.apiUrl}?q=${encodeURIComponent(query)}&limit=30`)
      .pipe(
        map(response =>
          response.docs.map((book: any) => ({
            title: book.title ?? 'Untitled',
            authors: book.author_name ?? ['Unknown Author'],
            cover: book.cover_i
              ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
              : 'assets/no-cover.png',
            year: book.first_publish_year ?? null,
            key: book.key,
            rating: 0,
            status: 'Want to Read',
            editionCount: book.edition_count ?? null,
            languages: book.language ?? [],
            seriesName: book.series_name?.[0] ?? null,
            seriesPosition: book.series_position?.[0] ?? null,
            ebookAccess: book.ebook_access ?? null,
            hasFulltext: book.has_fulltext ?? false,
            authorKeys: book.author_key ?? [],
            totalPages: book.number_of_pages_median ?? null,
          }))
        ),
        tap(books => this.searchCache.set(query, books))
      );
  }

  getBookDetails(workKey: string): Observable<any> {
    if (this.detailsCache.has(workKey)) {
      return of(this.detailsCache.get(workKey)!);
    }

    return this.http
      .get<any>(`${this.worksUrl}${workKey}.json`)
      .pipe(tap(data => this.detailsCache.set(workKey, data)));
  }
}