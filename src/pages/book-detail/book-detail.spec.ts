import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookDetail } from './book-detail';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('BookDetail', () => {
  let component: BookDetail;
  let fixture: ComponentFixture<BookDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookDetail],
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BookDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
