import { Injectable } from '@angular/core';

export interface AddBookFormData {
  title: string;
  author: string;
  cover: string;
  genre: string;
  year: string;
  total_pages: string;
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class AddBookState {
  private formData: AddBookFormData | null = null;
  private selectedPdfFile: File | null = null;

  setFormData(data: AddBookFormData): void {
    this.formData = data;
  }

  getFormData(): AddBookFormData | null {
    return this.formData;
  }

  setSelectedPdfFile(file: File | null): void {
    this.selectedPdfFile = file;
  }

  getSelectedPdfFile(): File | null {
    return this.selectedPdfFile;
  }

  clear(): void {
    this.formData = null;
    this.selectedPdfFile = null;
  }
}
