import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { BACKEND_URL } from './auth.interceptor';




export interface LibraryBook {
  id: number;
  title: string;
  authors: string[];
  cover: string;
  year: number | null;
  key: string;
  status: string;
  rating: number;
  pages_read: number;
  total_pages: number | null;
  date_started: string | null;
  date_finished: string | null;
  genre?: string | null;
  notes?: string | null;
  has_pdf?: boolean;
  pdf_filename: string | null;
  editionCount?: number;
  languages?: string[];
  seriesName?: string;
  seriesPosition?: string;
  ebookAccess?: string;
  hasFulltext?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Library {

  books = signal<LibraryBook[]>([]);

  constructor(private http: HttpClient) {}

  loadBooks(): Observable<LibraryBook[]> {
    return this.http.get<LibraryBook[]>(`${BACKEND_URL}/books/`).pipe(
      tap(books => this.books.set(books))
    );
  }

  addBook(book: any): Observable<LibraryBook> {
    const payload = {
      title: book.title,
      authors: Array.isArray(book.authors) ? book.authors : [book.authors],
      cover: book.cover || '',
      year: book.year ?? null,
      key: book.key,
      total_pages: book.total_pages ?? book.totalPages ?? null,
      ebook_access: book.ebook_access ?? book.ebookAccess ?? null,
      has_fulltext: book.has_fulltext ?? book.hasFulltext ?? false,
      genre: book.genre ?? null,
      notes: book.notes ?? null,
    };
    return this.http.post<LibraryBook>(`${BACKEND_URL}/books/`, payload).pipe(
      tap(newBook => this.books.update(list => [...list, newBook]))
    );
  }

  updateBook(id: number, changes: Partial<{
    status: string;
    rating: number;
    pages_read: number;
    total_pages: number;
    date_started: string | null;
    date_finished: string | null;
    genre: string | null;
    notes: string | null;
  }>): Observable<LibraryBook> {
    return this.http.put<LibraryBook>(`${BACKEND_URL}/books/${id}`, changes).pipe(
      tap(updated => {
        this.books.update(list => list.map(b => b.id === id ? updated : b));
      })
    );
  }

  setBookStatus(id: number, status: string): Observable<LibraryBook> {
    const today = new Date().toISOString().split('T')[0];
    const book = this.books().find(b => b.id === id);
    const changes: any = { status };

    if (status === 'Want to Read') {
      changes.date_started = null;
      changes.date_finished = null;
      changes.pages_read = 0;
    }
    if (status === 'Reading') {
      changes.date_finished = null;
      if (!book?.date_started) changes.date_started = today;
    }
    if (status === 'Read') {
      changes.date_finished = today;
      if (!book?.date_started) changes.date_started = today;
    }

    return this.updateBook(id, changes);
  }

  deleteBook(id: number): Observable<any> {
    return this.http.delete(`${BACKEND_URL}/books/${id}`).pipe(
      tap(() => this.books.update(list => list.filter(b => b.id !== id)))
    );
  }

  clearAllBooks(): Observable<any> {
    return this.http.delete(`${BACKEND_URL}/books/`).pipe(
      tap(() => this.books.set([]))
    );
  }

  getByKey(key: string): LibraryBook | undefined {
    return this.books().find(b => b.key === key);
  }

  uploadPdf(bookId: number, file: File): Observable<{ message: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);       
    return this.http.post<any>(`${BACKEND_URL}/books/${bookId}/pdf`, formData);
  }
  
  getPdfBlob(bookId: number): Observable<Blob> {
    return this.http.get(`${BACKEND_URL}/books/${bookId}/pdf`, {
      responseType: 'blob'     
    });
  }

}
