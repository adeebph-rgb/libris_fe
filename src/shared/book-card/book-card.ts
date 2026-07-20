import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-card.html',
  styleUrl: './book-card.css',
})
export class BookCard {

  @Input() book!: any;
  @Input() mode: 'discover' | 'library' = 'discover';
  @Input() inLibrary = false;

  @Output() addToLibrary = new EventEmitter<void>();
  @Output() ratingChange = new EventEmitter<number>();
  @Output() statusChange = new EventEmitter<string>();
  @Output() bookClick = new EventEmitter<any>();
  @Output() deleteBook = new EventEmitter<void>();

  readonly statuses = ['Want to Read', 'Reading', 'Read'];

  get hasCover(): boolean {
    return !!this.book?.cover && !this.book.cover.includes('no-cover');
  }

  onCardClick(): void {
    this.bookClick.emit(this.book);
  }

  onAdd(event: MouseEvent): void {
    event.stopPropagation();
    if (!this.inLibrary) {
      this.addToLibrary.emit();
    }
  }

  setRating(star: number): void {
    this.ratingChange.emit(star);
  }

  setStatus(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.statusChange.emit(value);
  }

  get progressPercent(): number {
    const pages = this.book?.pages_read ?? this.book?.pagesRead ?? 0;
    const total = this.book?.total_pages ?? this.book?.totalPages ?? 0;
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((pages / total) * 100));
  }

  onDelete(event: MouseEvent): void {
    event.stopPropagation();
    this.deleteBook.emit();
  }
}
