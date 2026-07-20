import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Library } from '../../services/library';
import { Router } from '@angular/router';
import { AddBookState } from '../../services/add-book-state';

@Component({
  selector: 'app-add-book',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-book.html',
  styleUrl: './add-book.css',
})
export class AddBook {

  bookForm: FormGroup;
  selectedPdfFile: File | null = null; 
  pdfUploadStatus: 'idle' | 'uploading' | 'done' | 'error' = 'idle';

  constructor(
    private fb: FormBuilder,
    private libraryService: Library,
    private router: Router,
    private stateService: AddBookState
  ){
    const savedData = this.stateService.getFormData();
    this.bookForm = this.fb.group({
      title: [savedData?.title || ''],
      author: [savedData?.author || ''],
      cover: [savedData?.cover || ''],
      genre: [savedData?.genre || ''],
      year: [savedData?.year || ''],
      total_pages: [savedData?.total_pages || ''],
      status: [savedData?.status || 'Want to Read']
    });

    this.selectedPdfFile = this.stateService.getSelectedPdfFile();

    this.bookForm.valueChanges.subscribe(val => {
      this.stateService.setFormData(val);
    });
  }
  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedPdfFile = input.files[0];
      this.stateService.setSelectedPdfFile(this.selectedPdfFile);
    }
  }

  addBook(): void {
    const f = this.bookForm.value;
    this.libraryService.addBook({
      title: f.title,
      authors: [f.author],
      cover: f.cover || '',
      year: f.year ? parseInt(f.year) : null,
      key: `/works/manual-${Date.now()}`,
      total_pages: f.total_pages ? parseInt(f.total_pages) : null,
      genre: f.genre || null,
      notes: null,
      status: f.status || 'Want to Read',
      rating: 0,
    }).subscribe({
      next: (newBook) => {
        this.stateService.clear();
        if (this.selectedPdfFile) {
          this.pdfUploadStatus = 'uploading';
          this.libraryService.uploadPdf(newBook.id, this.selectedPdfFile).subscribe({
            next: () => {
              this.pdfUploadStatus = 'done';
              this.router.navigate(['/library']);   
            },
            error: () => {
              this.pdfUploadStatus = 'error';
            }
          });
        } else {
          this.router.navigate(['/library']);     
        }
      },
      error: (err) => console.error('Failed to add book:', err)
    });
  }
}
