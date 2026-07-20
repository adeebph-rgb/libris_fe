import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth';
import { Library } from '../../services/library';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  profileForm!: FormGroup;
  showClearModal = signal(false);
  clearConfirmText = '';
  feedbackMsg = signal('');
  isError = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private libraryService: Library
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.profileForm = this.fb.group({
      name: [user?.name || '', [Validators.required]],
      email: [user?.email || '', [Validators.required, Validators.email]],
      yearlyGoal: [user?.yearlyGoal || 10, [Validators.required, Validators.min(1)]]
    });
  }

  saveSettings(): void {
    if (this.profileForm.invalid) {
      return;
    }
    const { name, email, yearlyGoal } = this.profileForm.value;
    this.authService.updateProfile({ name, email, yearlyGoal }).subscribe({
      next: () => {
        this.showFeedback('Settings saved successfully!', false);
      },
      error: (err) => {
        const errorDetail = err?.error?.detail || 'Failed to save settings.';
        this.showFeedback(errorDetail, true);
      }
    });
  }

  clearLibrary(): void {
    if (this.clearConfirmText !== 'DELETE') {
      this.showFeedback('Please type DELETE to confirm.', true);
      return;
    }
    this.libraryService.clearAllBooks().subscribe({
      next: () => {
        this.showClearModal.set(false);
        this.clearConfirmText = '';
        this.showFeedback('All library data has been cleared.', false);
      },
      error: () => this.showFeedback('Failed to clear library.', true)
    });
  }


  private showFeedback(msg: string, isError: boolean): void {
    this.feedbackMsg.set(msg);
    this.isError.set(isError);
    setTimeout(() => this.feedbackMsg.set(''), 2000);
  }
}
