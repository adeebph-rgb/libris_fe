import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Library } from '../../services/library';

@Component({
  selector: 'app-add-book',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-book.html',
  styleUrl: './add-book.css',
})
export class AddBook {

  bookForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private libraryService: Library
  ){
    this.bookForm = this.fb.group({
      title:[''],
      author:[''],
      cover: [''], 
      genre:[''],
      year:[''],
      status:['Want to Read'],
      rating:[0],
      description:[''],
      notes:['']
    });
  }
  addBook() {
    this.libraryService.addBook(this.bookForm.value);
    console.log(this.libraryService.getBooks());
    
  }
}
