import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class Library {

    books: any[] = JSON.parse(localStorage.getItem('books') || '[]');

    constructor(){}

    addBook(book: any){
        this.books.push(book)
        localStorage.setItem('books', JSON.stringify(this.books))
    }

    getBooks(){
        return this.books;
    }

    updateBook(index: number, changes: Partial<any>): void {
        this.books[index] = { ...this.books[index], ...changes };
        localStorage.setItem('books', JSON.stringify(this.books));
    }

    setBookStatus(index: number, status: string): void {
        const changes: any = { status };
        const book = this.books[index];
        const today = new Date().toISOString().split('T')[0];
        if (status === 'Want to Read') {
            changes.dateStarted = '';
            changes.dateFinished = '';
            changes.pagesRead = 0;
        }
        if (status === 'Reading') {
            changes.dateFinished = '';
            if (!book.dateStarted) changes.dateStarted = today;
        }
        if (status === 'Read') {
            changes.dateFinished = today;
            if (!book.dateStarted) changes.dateStarted = today;
        }
        this.updateBook(index, changes);
    }

    deleteBook(index: number){
        this.books.splice(index, 1);
        localStorage.setItem('books', JSON.stringify(this.books));
    }
}

