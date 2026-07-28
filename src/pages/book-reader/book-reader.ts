import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Library } from '../../services/library';
import * as pdfjsLib from 'pdfjs-dist';
import { AiService, TextSimplificationResponse } from '../../services/ai-service';
import { BookmarkService, Bookmark } from '../../services/bookmark';
import { Session } from '../../services/session';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './book-reader.html',
  styleUrl: './book-reader.css',
})
export class BookReader implements OnInit, OnDestroy {

  readingTimeSeconds = signal<number>(0);
  isTimerPaused = signal<boolean>(false);
  isIdlePaused = signal<boolean>(false);
  isManualPaused = signal<boolean>(false);
  private activeTimerInterval: any = null;
  private idleTimerTimeout: any = null;
  private readonly IDLE_THRESHOLD_MS = 2 * 60 * 1000;

  bookmarks = signal<Bookmark[]>([]);
  isBookmarked = computed(()=> this.bookmarks().some(b=>b.page_number === this.currentPage()));
  currentBookmark = computed(()=> this.bookmarks().find(b=>b.page_number === this.currentPage()));

  bookmarksPanelOpen = signal(false);
  showNoteModal = signal(false);
  bookmarkNoteText = signal('')
  editingBookmarkId = signal<number | null>(null);

  bookId = signal<number | null>(null);
  bookTitle = signal('');
  currentPage = signal(1);
  totalPages = signal(0);
  contentStartPage = signal(1);
  isFrontMatter = computed(() => this.currentPage() < this.contentStartPage());
  loading = signal(true);
  error = signal('');
  isFullscreen = signal(false);
  pageHtml = signal('');
  fontSize = signal<number>(1.05);
  isFlipping = signal<'none'|'forward'|'backward'>('none');
  isImagePage = signal(false);
  book: any = null;

  selectedText = signal('')
  popoverPosition = signal<{top:number; left:number} | null>(null);
  aiPanelOpen = signal(false);
  aiLoading = signal(false);
  aiResponse = signal<TextSimplificationResponse | null>(null);
  aiError = signal('');
  copiedState = signal(false);


  private pdfDoc: any = null;
  private syncTimer: any = null;   
  private pageCache = new Map<number, string>();
  private touchStartX = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private library: Library,
    private elRef: ElementRef,
    private aiService: AiService,
    private bookmarkService: BookmarkService,
    private sessionService: Session
  ) {}

  ngOnInit(): void {
    const key = this.route.snapshot.paramMap.get('key');
    const state = history.state as { bookId?: number; book?: any };

    if (state?.bookId && state?.book) {
      this.initializeReader(state.bookId, state.book);
    } else if (key) {
      if (this.library.books().length === 0) {
        this.library.loadBooks().subscribe({
          next: (books) => {
            const book = books.find(b => b.key.replace(/^\/?works\//, '') === key);
            if (book) {
              this.initializeReader(book.id, book);
            } else {
              this.error.set('Book not found in library. Please go back.');
              this.loading.set(false);
            }
          },
          error: () => {
            this.error.set('Failed to load library books.');
            this.loading.set(false);
          }
        });
      } else {
        const book = this.library.books().find(b => b.key.replace(/^\/?works\//, '') === key);
        if (book) {
          this.initializeReader(book.id, book);
        } else {
          this.error.set('Book not found in library. Please go back.');
          this.loading.set(false);
        }
      }
    } else {
      this.error.set('No book selected. Please go back.');
      this.loading.set(false);
    }
    this.startActiveTimer();
    this.resetIdleTimer();
  }

  private initializeReader(id: number, book: any): void {
    this.pageCache.clear();
    this.bookId.set(id);
    this.bookTitle.set(book?.title ?? 'Book');
    this.book = book;

    const libBook = this.library.books().find(b => b.id === id) || book;
    
    const savedStartPage = localStorage.getItem(`book_content_start_${id}`);
    if (savedStartPage) {
      const parsed = parseInt(savedStartPage, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        this.contentStartPage.set(parsed);
      }
    }

    const localProgress = localStorage.getItem(`book_progress_${id}`);
    let startPage = 1;
    if (localProgress) {
      const parsedProgress = parseInt(localProgress, 10);
      if (!isNaN(parsedProgress) && parsedProgress >= 1) {
        startPage = parsedProgress;
      }
    } else if (libBook?.pages_read) {
      startPage = Math.max(1, libBook.pages_read);
    }

    if (startPage < this.contentStartPage() && (!libBook?.pages_read || libBook.pages_read <= 1)) {
      startPage = this.contentStartPage();
    }

    this.loadBookmarks(id);
  
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
      this.displayPage(startPage)
      // setTimeout(() => {
      //   this.renderPage(startPage);
      // });
    }).catch(() => {
      this.error.set('Failed to render PDF.');
      this.loading.set(false);
    });
  }

  private async displayPage(pageNum: number): Promise<void>{

    this.closeAiPanel();
    this.currentPage.set(pageNum);
    
    const id = this.bookId();
    if (id !== null) {
      localStorage.setItem(`book_progress_${id}`, pageNum.toString());
    }

    if(this.pageCache.has(pageNum)){
      this.pageHtml.set(this.pageCache.get(pageNum)!);
      this.isImagePage.set(this.pageHtml() ==='');
      this.saveProgressDebounced(pageNum);
      this.scrollToTop();
      return;
    }

    const page = await this.pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();

    const html = this.buildPageHtml(content.items);
    this.pageCache.set(pageNum, html);
    this.pageHtml.set(html);
    this.isImagePage.set(html ==='');
    this.saveProgressDebounced(pageNum);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const container = this.elRef.nativeElement.querySelector('.page-content');
      if (container) {
        container.scrollTop = 0;
      }
    }, 0);
  }

  // private renderPage(pageNum: number): void {
  //   this.currentPage.set(pageNum);
  //   this.pdfDoc.getPage(pageNum).then((page: any) => {
  //     const canvas = this.canvasRef.nativeElement;
  //     const ctx = canvas.getContext('2d');
  //     const viewport = page.getViewport({ scale: 1.4});  

  //     canvas.width = viewport.width;
  //     canvas.height = viewport.height;

  //     page.render({ canvasContext: ctx, viewport }).promise.then(() => {
  //       this.saveProgressDebounced(pageNum);
  //     });
  //   });
  // }
  private buildPageHtml(items: any[]): string {
    if (!items || items.length === 0) return '';

    const rawLines: { x: number; y: number; text: string }[] = [];
    for (const item of items) {
      const str = item.str?.trim();
      if (!str) continue;
      const x = item.transform?.[4] ?? 0;
      const y = Math.round(item.transform?.[5] ?? 0);
      const last = rawLines[rawLines.length - 1];

      const isSuperscript = last && (y - last.y >= 2) && /^\d{1,3}$/.test(str);

      if (last && Math.abs(last.y - y) <= 6) {
        if (isSuperscript) {
          last.text += `<sup>${str}</sup> `;
        } else {
          last.text += (last.text.endsWith('>') || last.text.endsWith(' ') ? '' : ' ') + item.str;
        }
      } else {
        rawLines.push({ x, y, text: item.str });
      }
    }

    if (rawLines.length === 0) return '';

    const yValues = rawLines.map(l => l.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const yRange = maxY - minY;

    const isPageNum = (str: string) =>
      /^(?:page\s*)?(?:\d+|[ivxlcdm]+)$/i.test(str.trim());

    const isFooterHeaderArtifact = (str: string, isEdge: boolean) => {
      const s = str.trim();
      if (!s) return true;

      if (isPageNum(s)) return true;

   
      if (/(?:isbn|copyright|\b\d{5,}\w*)/i.test(s) && isEdge) return true;

      const title = this.bookTitle().toLowerCase().trim();
      const lower = s.toLowerCase();
      if (title && (lower === title)) return true;

     
      const wordCount = s.split(/\s+/).filter(Boolean).length;
      if (isEdge && wordCount <= 3) {
        if (/(?:\d+|[ivxlcdm]{2,})\s*$/i.test(s)) return true;  
        if (/^(?:\d+|[ivxlcdm]{2,})\s/i.test(s)) return true;   
      }

      return false;
    };

    const filteredLines = rawLines.filter((line) => {
      const relativeY = yRange > 0 ? (line.y - minY) / yRange : 0.5;
      const isTopMargin = relativeY > 0.88;
      const isBottomMargin = relativeY < 0.12;

      if (isTopMargin || isBottomMargin) {
        if (isFooterHeaderArtifact(line.text, true)) return false;
      }

      return true;
    });

    if (filteredLines.length === 0) return '';

    const xValues = filteredLines.map(l => l.x);
    const minX = Math.min(...xValues);

    const isDateStart = (str: string) =>
      /^\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i.test(str.trim());

    const isFootnotePattern = (str: string) => {
      const s = str.trim();
      if (isDateStart(s)) return false;

      if (/^(?:<sup>\d{1,2}<\/sup>|[\u00B9\u00B2\u00B3\u2070-\u2079]{1,2})\s*/i.test(s)) {
        return true;
      }

      return /^\d{1,2}\s+[A-Z]/i.test(s);
    };

    const paragraphs: { text: string; relY: number }[] = [];
    let currentLines: string[] = [];
    let currentRelY = 1.0;

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      const currText = line.text.trim();
      currentLines.push(currText);
      
      const lineRelY = yRange > 0 ? (line.y - minY) / yRange : 0.5;
      if (lineRelY < currentRelY) currentRelY = lineRelY;

      const next = filteredLines[i + 1];
      const nextText = next ? next.text.trim() : '';
      const nextRelY = next && yRange > 0 ? (next.y - minY) / yRange : 0.5;
      
      const gap = next ? Math.abs(line.y - next.y) : 999;
      const isNextIndented = next ? (next.x - minX > 8) : false;
      const isNextFootnote = next ? (nextRelY < 0.28 && isFootnotePattern(nextText)) : false;

      const isContinuation = /^[a-z]/.test(nextText) && !/[.!?\u201D"']\s*$/.test(currText);

      if (isNextFootnote || (!isContinuation && (gap > 14 || isNextIndented))) {
        paragraphs.push({ text: currentLines.join(' '), relY: currentRelY });
        currentLines = [];
        currentRelY = 1.0;
      }
    }
    if (currentLines.length) {
      paragraphs.push({ text: currentLines.join(' '), relY: currentRelY });
    }

    let insertedDivider = false;

    return paragraphs
      .map(pObj => {
        let clean = pObj.text.trim();
        clean = clean.replace(/(\b[a-zA-Z]{2,})\s*-\s+([a-zA-Z]{2,}\b)/g, '$1$2');
        clean = clean.replace(/\s+(?:\d{5,}\w*|\b[ivxlcdm]{1,6}\b)\s*$/i, '').trim();
        return { clean, relY: pObj.relY };
      })
      .filter(item => item.clean.length > 0 && !isPageNum(item.clean))
      .map(item => {
        const isFootnote = item.relY < 0.28 && isFootnotePattern(item.clean);
        if (isFootnote) {
          let prefix = '';
          if (!insertedDivider) {
            insertedDivider = true;
            prefix = '<hr class="footnote-divider" />';
          }
          return `${prefix}<p class="footnote-text">${item.clean}</p>`;
        }
        return `<p>${item.clean}</p>`;
      })
      .join('');
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) {
      this.pauseTimer(); 
    } else {
      if (!this.isIdlePaused() && !this.isManualPaused()) {
        this.resumeTimer();
      }
    }
  }

  @HostListener('document:mousemove')
  @HostListener('document:keydown')
  @HostListener('document:scroll')
  @HostListener('document:touchstart')
  onUserActivity(): void {
    if (this.isManualPaused()) {
      return;
    }
    if (this.isIdlePaused()) {
      this.isIdlePaused.set(false);
      this.resumeTimer();
    }
    this.resetIdleTimer();
  }

  private startActiveTimer(): void {
    if (this.activeTimerInterval) clearInterval(this.activeTimerInterval);
    this.activeTimerInterval = setInterval(() => {
      if (!this.isTimerPaused() && !document.hidden) {
        this.readingTimeSeconds.update(s => s + 1);
      }
    }, 1000);
  }

  private resetIdleTimer(): void {
    if (this.idleTimerTimeout) clearTimeout(this.idleTimerTimeout);
    this.idleTimerTimeout = setTimeout(() => {
      this.handleIdleTimeout();
    }, this.IDLE_THRESHOLD_MS);
  }

  private handleIdleTimeout(): void {
    this.isIdlePaused.set(true);
    this.pauseTimer();
  }

  toggleTimerManual(): void {
    if (this.isTimerPaused()) {
      this.isManualPaused.set(false);
      this.isIdlePaused.set(false);
      this.resumeTimer();
    } else {
      this.isManualPaused.set(true);
      this.pauseTimer();
    }
  }

  pauseTimer(): void {
    this.isTimerPaused.set(true);
  }

  resumeTimer(): void {
    this.isTimerPaused.set(false);
    this.resetIdleTimer();
  }

  formattedReadingTime = computed(() => {
    const totalSec = this.readingTimeSeconds();
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  });


  @HostListener('document:selectionChange')
  @HostListener('mouseup')
  onTextSelection():void{
    const selection = window.getSelection();
    if(!selection || selection.isCollapsed){
      if(!this.aiPanelOpen()){
        this.popoverPosition.set(null);
      }
      return;
    }
    const text = selection.toString().trim();
    if(text.length < 5){
      if(!this.aiPanelOpen()){
        this.popoverPosition.set(null)
      }
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = this.elRef.nativeElement.querySelector('.page-content');

    if (container && container.contains(range.commonAncestorContainer)) {
      const containerRect = container.getBoundingClientRect();
      this.selectedText.set(text);


      let top = rect.top - containerRect.top + 15;
      if (top < 40) {
        top = rect.bottom - containerRect.top -2;
      }
      const left = rect.left - containerRect.left + (rect.width / 2)

      this.popoverPosition.set({ top, left });
    }
  }

  loadBookmarks(bookId: number):void{
    this.bookmarkService.getBookmarks(bookId).subscribe({
      next: (data)=> this.bookmarks.set(data),
      error: (err)=> console.error('Failed to load bookmarks',err)
    });
  }

  toggleBookmark(): void{
  if(this.isBookmarked()){
    const bookmark = this.currentBookmark();
    if(bookmark){
      this.deleteBookmark(bookmark.id);
    }
  }else{
    this.editingBookmarkId.set(null);
    this.bookmarkNoteText.set('');
    this.showNoteModal.set(true);
    }
  }

  saveBookmarkNote(): void{
    const id = this.bookId();
    if(id === null) return;

    const note = this.bookmarkNoteText().trim();
    const editingId = this.editingBookmarkId();

    if(editingId !==  null){
      this.bookmarkService.updateBookmark(editingId, {note}).subscribe({
        next: (updated)=>{
          this.bookmarks.update(list => list.map(b=> b.id === editingId ? updated: b));
          this.closeNoteModal();
        },
        error: (err)=> console.error('Failed to update bookmark note', err)
    });
    }else{
      const page_number = this.currentPage();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.pageHtml();
      let text = tempDiv.textContent || tempDiv.innerText || '';
      text = text.replace(/\s+/g,' ').trim();
      const snippet = text.substring(0,150) + (text.length> 150? '...':'');

      this.bookmarkService.createBookmark(id, { page_number, note, snippet}).subscribe({
        next: (newBookmark)=>{
          this.bookmarks.update(list => [...list, newBookmark].sort((a,b)=> a.page_number - b.page_number));
          this.closeNoteModal();
        },
        error: (err)=> console.error('Failed to create bookmark note', err)
      });
    }
  }

  editingBookmarkNote(bookmark: Bookmark): void{
    this.editingBookmarkId.set(bookmark.id);
    this.bookmarkNoteText.set(bookmark.note || '');
    this.showNoteModal.set(true);
  }

  deleteBookmark(bookmarkId: number): void{
    this.bookmarkService.deleteBookmark(bookmarkId).subscribe({
      next: ()=>{
        this.bookmarks.update(list => list.filter(b => b.id !== bookmarkId));
      },
      error: (err)=> console.error('Failed to delete bookmark', err) 
    });
  }
  
  closeNoteModal():void {
    this.showNoteModal.set(false);
    this.bookmarkNoteText.set('')
    this.editingBookmarkId.set(null);
  }

  toggleBookmarksDrawer(): void{
    const nextState = !this.bookmarksPanelOpen();
    this.bookmarksPanelOpen.set(nextState);
    if(nextState){
      this.closeAiPanel();
    }
  }

  jumpToBookmarkPage(pageNum: number): void{
    const minPage = this.contentStartPage();
    if(pageNum>= minPage && pageNum <= this.totalPages() && this.isFlipping() === 'none'){
      const dir = pageNum > this.currentPage()? 'forward' : 'backward';
      this.flipTo(pageNum, dir);
      this.bookmarksPanelOpen.set(false);
    }
  }

  simplifySelectedText():void {
    const text = this.selectedText();
    if(!text) return;

    this.aiPanelOpen.set(true);
    this.bookmarksPanelOpen.set(false)
    this.aiLoading.set(true);
    this.aiError.set('');
    this.popoverPosition.set(null);

    this.aiService.simplifyText({
      text: text,
      book_title: this.bookTitle()
    }).subscribe({
      next: (res)=>{
        this.aiResponse.set(res);
        this.aiLoading.set(false);
      },
      error: (err)=>{
        this.aiError.set(err?.error?.detail || 'Failed to simplify text using AI');
        this.aiLoading.set(false);
      }
    })
  }

  closeAiPanel(): void{
    this.aiPanelOpen.set(false);
    this.popoverPosition.set(null);
    this.selectedText.set('');
    const selection = window.getSelection();
    if(selection) selection.removeAllRanges();
  }

 

  nextPage(): void {
    if (this.currentPage() < this.totalPages() && this.isFlipping() === 'none') {
      this.flipTo(this.currentPage() + 1, 'forward');
    }
  }

  prevPage(): void {
    if (this.currentPage() > this.contentStartPage() && this.isFlipping() === 'none') {
      this.flipTo(this.currentPage() - 1, 'backward');
    }
  }

  jumpToPage(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value);
    const minPage = this.contentStartPage();
    if (val >= minPage && val <= this.totalPages() && this.isFlipping() === 'none') {
      const dir = val > this.currentPage() ? 'forward' : 'backward';
      this.flipTo(val, dir as 'forward' | 'backward');
    }
  }

  private flipTo(pageNum: number, direction: 'forward' | 'backward'): void {
    if (this.isFlipping() !== 'none') return;
    this.isFlipping.set(direction);
    
    setTimeout(() => {
      this.displayPage(pageNum);
    }, 200);

    setTimeout(() => {
      this.isFlipping.set('none');
    }, 400);
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

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
  }

  onTouchEnd(event: TouchEvent): void {
    const delta = event.changedTouches[0].clientX - this.touchStartX;
    if (Math.abs(delta) > 60) {
      delta < 0 ? this.nextPage() : this.prevPage();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.nextPage();
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.prevPage();
    }
  }

  setStartPage(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value) || 1;
    const clamped = Math.max(1, Math.min(val, this.totalPages() || 1));
    this.contentStartPage.set(clamped);
  
    const id = this.bookId();
    if (id !== null) {
      localStorage.setItem(`book_content_start_${id}`, clamped.toString());
    }

    if (this.currentPage() < clamped) {
      this.flipTo(clamped, 'forward');
    }
  }

  zoomIn(): void {
    this.fontSize.update(s => Math.min(2.0, +(s + 0.1).toFixed(2)));
  }

  zoomOut(): void {
    this.fontSize.update(s => Math.max(0.75, +(s - 0.1).toFixed(2)));
  }

  resetZoom(): void {
    this.fontSize.set(1.0);
  }

  get zoomPercent(): number {
    return Math.round(this.fontSize() * 100);
  }

  get progressPercent(): number {
    const total = this.totalPages();
    const start = this.contentStartPage();
    if (!total || total < start) return 0;
    const current = this.currentPage();
    if (current < start) return 0;
    const totalContentPages = total - start + 1;
    const readContentPages = current - start + 1;
    return Math.min(100, Math.round((readContentPages / totalContentPages) * 100));
  }

  toggleFullscreen(): void {
    const element = this.elRef.nativeElement.firstElementChild as HTMLElement;
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
     if (this.activeTimerInterval) clearInterval(this.activeTimerInterval);
    if (this.idleTimerTimeout) clearTimeout(this.idleTimerTimeout);
    const activeSeconds = this.readingTimeSeconds();
    const currentBookId = this.bookId();
    if (activeSeconds >= 10 && currentBookId !== null) {
      const todayDate = new Date().toISOString().split('T')[0];
      this.sessionService.logSession({
        book_id: currentBookId,
        date: todayDate,
        duration_seconds: activeSeconds
      }).subscribe({
        next: () => console.log(`Logged ${activeSeconds}s reading session for book ${currentBookId}`),
        error: (err) => console.error('Failed to log session:', err)
      });
    }
  }
}
