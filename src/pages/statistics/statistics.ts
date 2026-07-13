import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Library } from '../../services/library';
import { AuthService } from '../../services/auth';
import { LucideBookOpen, LucideBookCheck, LucideFileText } from '@lucide/angular';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, LucideBookOpen, LucideBookCheck, LucideFileText],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements OnInit {
  protected readonly Math = Math;
  books = signal<any[]>([]);

  totalBooks = computed(() => this.books().length);

  booksRead = computed(() => this.books().filter(b => b.status === 'Read').length);
  booksReading = computed(() => this.books().filter(b => b.status === 'Reading').length);
  booksWantToRead = computed(() => this.books().filter(b => b.status === 'Want to Read').length);

  totalPagesRead = computed(() => {
    return this.books().reduce((acc, b) => acc + (b.pagesRead || 0), 0);
  });

  averageRating = computed(() => {
    const rated = this.books().filter(b => b.rating > 0);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, b) => acc + b.rating, 0);
    return parseFloat((sum / rated.length).toFixed(1));
  });

  yearlyGoal = computed(() => {
    const user = this.authService.currentUser();
    return user ? (user.yearlyGoal || 10) : 10;
  });

  goalProgressPercent = computed(() => {
    const goal = this.yearlyGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.booksRead() / goal) * 100));
  });

  constructor(
    private libraryService: Library,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.books.set(this.libraryService.getBooks());
  }
}
