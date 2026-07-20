import { Component, OnInit, OnDestroy, signal, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Library } from '../../services/library';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './book-reader.html',
  styleUrl: './book-reader.css',
})
export class BookReader implements OnInit, OnDestroy {

  @ViewChild('pdfCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  bookId = signal<number | null>(null);
  bookTitle = signal('');
  currentPage = signal(1);
  totalPages = signal(0);
  loading = signal(true);
  error = signal('');
  isFullscreen = signal(false);
  pageHtml = signal('');
  isFlipping = signal<'none'|'forward'|'backward'>('none')
  isImagePage = signal(false);
  book: any = null;


  private pdfDoc: any = null;
  private syncTimer: any = null;   
  private pageCache = new Map<number, string>();

  private touchStartX = 0;
  private mouseStartX = 0;
  private isDragging = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private library: Library,
    private elRef: ElementRef
  ) {}

  ngOnInit(): void {
    const state = history.state as { bookId?: number; book?: any };

    if (!state?.bookId) {
      this.error.set('No book selected. Please go back.');
      this.loading.set(false);
      return;
    }

    const id = state.bookId;
    this.bookId.set(id);
    this.bookTitle.set(state.book?.title ?? 'Book');
    this.book = state.book;

    const libBook = this.library.books().find(b => b.id === id);
    const startPage = Math.max(1, libBook?.pages_read ?? 1);

  
    this.library.getPdfBlob(id).subscribe({
      next: (blob) => {
        const blobUrl = URL.createObjectURL(blob);   
        this.loadPdf(blobUrl, startPage);
      },
      error: () => {
        this.error.set('Failed to load PDF.');
        this.loading.set(false);
      }
    });
  }

  private loadPdf(url: string, startPage: number): void {
    pdfjsLib.getDocument({ url }).promise.then((pdf: any) => {
      this.pdfDoc = pdf;
      this.totalPages.set(pdf.numPages);
      this.loading.set(false);
      setTimeout(() => {
        this.renderPage(startPage);
      });
    }).catch(() => {
      this.error.set('Failed to render PDF.');
      this.loading.set(false);
    });
  }

  private renderPage(pageNum: number): void {
    this.currentPage.set(pageNum);
    this.pdfDoc.getPage(pageNum).then((page: any) => {
      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.4});  

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        this.saveProgressDebounced(pageNum);
      });
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.renderPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.renderPage(this.currentPage() - 1);
    }
  }

  jumpToPage(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value);
    if (val >= 1 && val <= this.totalPages()) {
      this.renderPage(val);
    }
  }

  private saveProgressDebounced(page: number): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      const id = this.bookId();
      if (id !== null) {
        this.library.updateBook(id, { pages_read: page }).subscribe();
      }
    }, 2000);
  }

  goBack(): void {
    const key = this.route.snapshot.paramMap.get('key');
    if (key) {
      this.router.navigate(['/book', key], {
        state: { book: this.book }
      });
    } else {
      this.router.navigate(['/library']);
    }
  }

  toggleFullscreen(): void {
    const element = this.elRef.nativeElement.querySelector('.reader-page');
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().catch((err: any) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen.set(!!document.fullscreenElement);
  }

  ngOnDestroy(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer); 
      const id = this.bookId();
      if (id !== null) {
        this.library.updateBook(id, { pages_read: this.currentPage() }).subscribe();
      }
    }
  }
}
