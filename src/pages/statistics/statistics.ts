import { Component, OnInit, signal, OnDestroy, computed, ElementRef, ViewChild, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Library } from '../../services/library';
import { AuthService } from '../../services/auth';
import { LucideBookOpen, LucideBookCheck, LucideFileText, LucideBookMarked, LucideChevronLeft, LucideChevronRight, LucideClock } from '@lucide/angular';
import { Chart, registerables } from 'chart.js';
import { Session } from '../../services/session';

Chart.register(...registerables);

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, LucideBookOpen, LucideBookCheck, LucideFileText, LucideBookMarked, LucideChevronLeft, LucideChevronRight, LucideClock],
  templateUrl: './statistics.html',
  styleUrl: './statistics.css'
})
export class Statistics implements OnInit, OnDestroy {
  protected readonly Math = Math;
  books = signal<any[]>([]);
  loading = signal<boolean>(true);
  currentYear = new Date().getFullYear();

  selectedYear = signal<number>(new Date().getFullYear());
  pastYearMode = signal<boolean>(false);

  @ViewChild('monthlyChart') monthlyChartRef!: ElementRef<HTMLCanvasElement>;

  private monthlyChartInstance: Chart | null = null;

  totalReadingSeconds = signal<number>(0);
  formattedTotalTime = computed(() => {
    const sec = this.totalReadingSeconds();
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs > 0 ? secs + 's' : ''}`.trim();
    return `${secs}s`;
  });

  totalBooks = computed(() => this.books().length);
  booksRead = computed(() => this.books().filter(b => b.status === 'Read').length);
  booksReading = computed(() => this.books().filter(b => b.status === 'Reading').length);
  booksWantToRead = computed(() => this.books().filter(b => b.status === 'Want to Read').length);
  totalPagesRead = computed(() =>
    this.books().reduce((acc, b) => acc + (b.pages_read || 0), 0)
  );
  yearlyGoal = computed(() => {
    const user = this.authService.currentUser();
    return user ? (user.yearlyGoal || 10) : 10;
  });
  goalProgressPercent = computed(() => {
    const goal = this.yearlyGoal();
    if (goal <= 0) return 0;
    return Math.min(100, Math.round((this.booksRead() / goal) * 100));
  });
 
  monthlyData = computed(() => {
    if (this.pastYearMode()) {
      const now = new Date();
      const counts = new Array(12).fill(0);
      for (const book of this.books()) {
        if (book.date_finished) {
          const date = new Date(book.date_finished);
          const diffMs = now.getTime() - date.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays < 365) {
            const slotIndex = 11 - Math.floor(diffDays / 30.44);
            if (slotIndex >= 0 && slotIndex < 12) {
              counts[slotIndex]++;
            }
          }
        }
      }
      return counts;
    } else {
      const year = this.selectedYear();
      const monthCounts = new Array(12).fill(0);
      for (const book of this.books()) {
        if (book.date_finished) {
          const date = new Date(book.date_finished);
          if (date.getFullYear() === year) {
            monthCounts[date.getMonth()]++;
          }
        }
      }
      return monthCounts;
    }
  });

  chartLabels = computed(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (this.pastYearMode()) {
      const now = new Date();
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
        return months[d.getMonth()];
      });
    }
    return months;
  });


  yearBoundaryIndex = computed(() => {
    if (!this.pastYearMode()) return -1;
    const now = new Date();
    const boundary = 11 - now.getMonth(); 
    return boundary > 0 ? boundary : -1; 
  });

  booksReadThisSelectedYear = computed(() => {
    if (this.pastYearMode()) {
      return this.monthlyData().reduce((a, b) => a + b, 0);
    }
    const year = this.selectedYear();
    return this.books().filter(b => {
      if (b.status !== 'Read' || !b.date_finished) return false;
      return new Date(b.date_finished).getFullYear() === year;
    }).length;
  });

  canGoForward = computed(() => this.selectedYear() < this.currentYear);

  constructor(
    private libraryService: Library,
    private authService: AuthService,
    private sessionService: Session
  ) {
    effect(() => {
      this.selectedYear();
      this.pastYearMode();
      this.monthlyData();
      setTimeout(() => this.buildMonthlyChart(), 0);
    });

    effect(() => {
      this.totalReadingSeconds.set(this.sessionService.totalSeconds());
    });
  }

  ngOnInit(): void {
    this.libraryService.loadBooks().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
        setTimeout(() => this.buildMonthlyChart(), 0);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    this.sessionService.refreshStats();
  }




  prevYear(): void {
    this.selectedYear.update(y => y - 1);
  }

  nextYear(): void {
    if (this.selectedYear() < this.currentYear) {
      this.selectedYear.update(y => y + 1);
    }
  }

  togglePastYearMode(): void {
    this.pastYearMode.update(v => !v);
  }


private buildMonthlyChart(): void {
    const canvas = this.monthlyChartRef?.nativeElement;
    if (!canvas) return;
    if (this.monthlyChartInstance) {
      this.monthlyChartInstance.destroy();
    }
    const data = this.monthlyData();
    const labels = this.chartLabels();
    const boundaryIndex = this.yearBoundaryIndex(); 
    const now = new Date();
    const prevYear = now.getFullYear() - 1;
    const currYear = now.getFullYear();

    const yearDividerPlugin = {
      id: 'yearDivider',
      afterDraw(chart: Chart) {
        if (boundaryIndex <= 0) return; 
        const ctx = chart.ctx;
        const xScale = chart.scales['x'];
        const yScale = chart.scales['y'];

        const xLeft  = xScale.getPixelForValue(boundaryIndex - 1);
        const xRight = xScale.getPixelForValue(boundaryIndex);
        const xMid   = (xLeft + xRight) / 2;

        const top    = yScale.top;
        const bottom = yScale.bottom;

        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(46, 74, 79, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(xMid, top);
        ctx.lineTo(xMid, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = 'rgba(46, 74, 79, 0.55)';
        ctx.textBaseline = 'top';

        ctx.textAlign = 'right';
        ctx.fillText(String(prevYear), xMid - 6, top + 2);

        ctx.textAlign = 'left';
        ctx.fillText(String(currYear), xMid + 6, top + 2);

        ctx.restore();
      }
    };

    this.monthlyChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Books Finished',
          data,
          backgroundColor: data.map(v =>
            v > 0 ? 'rgba(52, 169, 157, 0.85)' : 'rgba(229, 203, 144, 0.4)'
          ),
          borderColor: data.map(v =>
            v > 0 ? '#34A99D' : '#E5CB90'
          ),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      plugins: [yearDividerPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} book${ctx.parsed.y !== 1 ? 's' : ''} finished`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#2E4A4F',
              font: { size: 12 }
            },
            grid: {
              color: 'rgba(46, 74, 79, 0.08)'
            },
            border: { display: false }
          },
          x: {
            ticks: {
              color: '#2E4A4F',
              font: { size: 12 }
            },
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
  }
  ngOnDestroy(): void {
    this.monthlyChartInstance?.destroy();
  }
}
