import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Library } from '../../services/library';
import { BookCard } from '../../shared/book-card/book-card';

@Component({
  selector: 'app-mylibrary',
  standalone: true,
  imports: [CommonModule, BookCard],
  templateUrl: './mylibrary.html',
  styleUrl: './mylibrary.css',
})
export class Mylibrary {

  constructor(private libraryService: Library, private router: Router) {}

  get books(): any[] {
    return this.libraryService.getBooks();
  }

  openBook(book: any): void {
    const keySlug = book.key.replace('/works/', '');
    this.router.navigate(['/book', keySlug], { state: { book } });
  }

  onRatingChange(index: number, rating: number): void {
    this.libraryService.updateBook(index, { rating });
  }

  onStatusChange(index: number, status: string): void {
    this.libraryService.setBookStatus(index, status);
  }
}
