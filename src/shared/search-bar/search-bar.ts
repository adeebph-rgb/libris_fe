import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css'
})
export class SearchBar {
  @Output() search = new EventEmitter<string>();
  query: string = '';

  onSearch(): void {
    this.search.emit(this.query.trim());
  }

  onClear(): void {
    this.query = '';
    this.search.emit('');
  }
}
