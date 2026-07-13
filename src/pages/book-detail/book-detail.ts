import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BookApi } from '../../services/book-api';
import { Library } from '../../services/library';

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-detail.html',
  styleUrl: './book-detail.css',
})
export class BookDetail implements OnInit {
  book = signal<any>(null);
  details = signal<any>(null);
  loading = signal(true);
  detailsLoading = signal(true);
  error = signal('');

  inLibrary = signal(false);
  userRating = signal(0);
  userStatus = signal('Want to Read');
  justAdded = signal(false);

  userPagesRead = signal(0);
  userTotalPages = signal(0);
  userDateStarted = signal('');
  userDateFinished = signal('');

  showPagesInput = signal(false);

  readonly statuses = ['Want to Read', 'Reading', 'Read'];

  progressPercent = computed(() => {
    if (!this.userTotalPages() || this.userTotalPages() <= 0) return 0;
    return Math.min(100, Math.round((this.userPagesRead() / this.userTotalPages()) * 100));
  });

  readingTimeEstimate = computed(() => {
    const remaining = this.userTotalPages() - this.userPagesRead();
    if (remaining <= 0 || !this.userTotalPages()) return '';
    const minutes = remaining * 2.5;
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = minutes / 60;
    if (hours < 10) return `${hours.toFixed(1)} hrs`;
    const days = hours / 3;
    return `~${Math.ceil(days)} days`;
  });

  daysToRead = computed(() => {
    if (!this.userDateStarted() || !this.userDateFinished()) return 0;
    const start = new Date(this.userDateStarted()).getTime();
    const end = new Date(this.userDateFinished()).getTime();
    return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookApi: BookApi,
    private library: Library
  ) {}

  ngOnInit(): void {
    const nav = history.state as { book?: any };
    if (nav?.book) {
      this.book.set(nav.book);
      this.loading.set(false);
      this.loadDetails(nav.book.key);

      const libBook = this.library.getBooks().find((b: any) => b.key === nav.book.key);
      if (libBook) {
        this.inLibrary.set(true);
        this.userRating.set(libBook.rating ?? 0);
        this.userStatus.set(libBook.status ?? 'Want to Read');
        this.userPagesRead.set(libBook.pagesRead ?? 0);
        this.userTotalPages.set(libBook.totalPages ?? nav.book.totalPages ?? 0);
        this.userDateStarted.set(libBook.dateStarted ?? '');
        this.userDateFinished.set(libBook.dateFinished ?? '');
      } else if (nav.book.totalPages) {
        this.userTotalPages.set(nav.book.totalPages);
      }

      if (this.userTotalPages() > 0) {
        this.showPagesInput.set(true);
      }
    } else {
      this.error.set('Book data not found. Please go back and try again.');
      this.loading.set(false);
    }
  }

  loadDetails(workKey: string): void {
    this.bookApi.getBookDetails(workKey).subscribe({
      next: (data) => {
        this.details.set(data);
        this.detailsLoading.set(false);
        if (!this.userTotalPages() && data.number_of_pages) {
          this.userTotalPages.set(data.number_of_pages);
          if (this.inLibrary()) {
            this.syncToLibrary();
          }
        }
      },
      error: () => this.detailsLoading.set(false)
    });
  }

  get description(): string {
    const d = this.details()?.description;
    if (!d) return '';
    const raw = typeof d === 'string' ? d : d.value || '';
    
    let cleaned = raw;
    const splitIdx = raw.search(/(?:Contains|Contents|Table of Contents|-{3,})/i);
    if (splitIdx !== -1) {
      cleaned = raw.substring(0, splitIdx);
    }

    return cleaned
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .trim();
  }

  get subjects(): string[] {
    const list = this.details()?.subjects ?? [];
    return list
      .filter((s: string) => !s.toLowerCase().includes('award') && !s.includes(':') && !s.includes('='))
      .slice(0, 15);
  }

  get subjectPlaces(): string[] {
    return (this.details()?.subject_places ?? []).slice(0, 8);
  }

  get subjectTimes(): string[] {
    return (this.details()?.subject_times ?? []).slice(0, 5);
  }

  get firstSentence(): string {
    const fs = this.details()?.first_sentence;
    if (!fs) return '';
    if (typeof fs === 'string') return fs;
    if (typeof fs === 'object' && fs.value) return fs.value;
    return '';
  }

  get openLibraryUrl(): string {
    const key = this.book()?.key;
    return key ? `https://openlibrary.org${key}` : '';
  }

  get coverLarge(): string {
    const cover = this.book()?.cover;
    if (!cover || cover.includes('no-cover')) return '';
    return cover.replace(/-[SML]\.jpg$/, '-L.jpg');
  }

  get languages(): string[] {
    return (this.book()?.languages ?? []).slice(0, 10);
  }

  get ebookAccess(): string {
    return this.book()?.ebook_access ?? '';
  }

  get canBorrow(): boolean {
    const access = this.book()?.ebookAccess;
    return access === 'borrowable' || access === 'public';
  }

  get borrowUrl(): string {
    const key = this.book()?.key?.replace('/works/', '');
    return `https://openlibrary.org/works/${key}`;
  }

  setRating(star: number): void {
    this.userRating.set(star);
    this.syncToLibrary();
  }

  setStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.userStatus.set(value);
    const today = new Date().toISOString().split('T')[0];
    if (value === 'Want to Read') {
      this.userDateStarted.set('');
      this.userDateFinished.set('');
      this.userPagesRead.set(0);
    }
    if (value === 'Reading') {
      this.userDateFinished.set('');
      if (!this.userDateStarted()) this.userDateStarted.set(today);
    }
    if (value === 'Read') {
      this.userDateFinished.set(today);
      if (!this.userDateStarted()) this.userDateStarted.set(today);
    }
    if (this.inLibrary()) {
      const books = this.library.getBooks();
      const idx = books.findIndex((b: any) => b.key === this.book()?.key);
      if (idx !== -1) this.library.setBookStatus(idx, value);
    }
  }

  setPagesRead(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value) || 0;
    this.userPagesRead.set(val);
    this.syncToLibrary();
  }

  setTotalPages(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value) || 0;
    this.userTotalPages.set(val);
    this.syncToLibrary();
  }

  addToLibrary(): void {
    if (!this.inLibrary()) {
      this.library.addBook({
        ...this.book(),
        rating: this.userRating(),
        status: this.userStatus(),
        pagesRead: this.userPagesRead(),
        totalPages: this.userTotalPages(),
        dateStarted: this.userDateStarted(),
        dateFinished: this.userDateFinished(),
      });
      this.inLibrary.set(true);
      this.justAdded.set(true);
      setTimeout(() => this.justAdded.set(false), 2500);
    }
  }

  syncToLibrary(): void {
    if (this.inLibrary()) {
      const books = this.library.getBooks();
      const idx = books.findIndex((b: any) => b.key === this.book()?.key);
      if (idx !== -1) {
        this.library.updateBook(idx, {
          status: this.userStatus(),
          rating: this.userRating(),
          pagesRead: this.userPagesRead(),
          totalPages: this.userTotalPages(),
          dateStarted: this.userDateStarted(),
          dateFinished: this.userDateFinished(),
        });
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/discover']);
  }
}
