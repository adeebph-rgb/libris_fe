import { Component, OnInit } from '@angular/core';
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
export class Mylibrary implements OnInit {

  constructor(public library: Library, private router: Router) {}

  ngOnInit(): void {
    this.library.loadBooks().subscribe();
  }

  get books(): any[] {
    return this.library.books();
  }

  openBook(book: any): void {
    const keySlug = book.key.replace('/works/', '');
    this.router.navigate(['/book', keySlug], { state: { book } });
  }

  onRatingChange(book: any, rating: number): void {
    this.library.updateBook(book.id, { rating }).subscribe({
      error: (err) => console.error('Failed to update rating:', err)
    });
  }

  onStatusChange(book: any, status: string): void {
    this.library.setBookStatus(book.id, status).subscribe({
      error: (err) => console.error('Failed to update status:', err)
    });
  }

  onDeleteBook(book: any): void {
    this.library.deleteBook(book.id).subscribe({
      error: (err) => console.error('Failed to delete book:', err)
    });
  }
}
