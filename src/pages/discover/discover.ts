import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { BookApi, Book } from '../../services/book-api';
import { Library } from '../../services/library';
import { BookCard } from '../../shared/book-card/book-card';
import { SearchBar } from '../../shared/search-bar/search-bar';

interface Category {
  name: string;
  query: string;
  books: Book[];
}

@Component({
  selector: 'app-discover',
  standalone: true,
  imports: [CommonModule, BookCard, SearchBar],
  templateUrl: './discover.html',
  styleUrl: './discover.css',
})
export class Discover implements OnInit {

  categories = signal<Category[]>([
    { name: 'Fiction', query: 'fiction', books: [] },
    { name: 'Self Help', query: 'Self Help', books: [] },
    { name: 'Thriller', query: 'Thriller', books: [] },
    { name: 'Mystery', query: 'mystery', books: [] },
  ]);

  loading = signal(true);
  isSearching = signal(false);
  error = signal('');
  searchResults = signal<Book[] | null>(null);

  constructor(
    private bookApi: BookApi,
    private library: Library,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.library.loadBooks().subscribe();
    this.loadCategories();
  }

  isInLibrary(book: Book): boolean {
    return this.library.books().some(b => b.key === book.key);
  }

  addBook(book: Book): void {
    if (!this.isInLibrary(book)) {
      this.library.addBook(book).subscribe({
        error: (err) => console.error('Failed to add book:', err)
      });
    }
  }

  openBook(book: Book): void {
    const keySlug = book.key.replace('/works/', '');
    this.router.navigate(['/book', keySlug], { state: { book } });
  }

  scrollRow(el: HTMLElement, direction: 1 | -1): void {
    el.scrollBy({ left: direction * 600, behavior: 'smooth' });
  }

  onSearch(query: string): void {
    if (!query) {
      this.searchResults.set(null);
      this.error.set('');
      return;
    }

    this.isSearching.set(true);
    this.error.set('');
    this.bookApi.searchBooks(query).subscribe({
      next: (results) => {
        this.searchResults.set(results);
        this.isSearching.set(false);
        if (results.length === 0) {
          this.error.set('No books found matching your query.');
        }
      },
      error: (err) => {
        console.error('Search error:', err);
        this.error.set('Failed to search books. Please try again.');
        this.isSearching.set(false);
      }
    });
  }

  loadCategories(): void {
    const current = this.categories();
    const requests = current.map(category =>
      this.bookApi.searchBooks(category.query)
    );

    forkJoin(requests).subscribe({
      next: (responses) => {
        const updated = current.map((category, index) => ({
          ...category,
          books: responses[index]
        }));
        this.categories.set(updated);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('API error:', err);
        this.error.set('Failed to load books. Please try again.');
        this.loading.set(false);
      }
    });
  }
}