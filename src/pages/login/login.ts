import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  isLoginMode = signal(true);
  errorMsg = signal('');
  successMsg = signal('');
  showLoginPassword = signal(false);
  showSignupPassword = signal(false);
  loginForm: FormGroup;
  signupForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      name: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleMode(): void {
    this.isLoginMode.set(!this.isLoginMode());
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      return;
    }
    const { name, password } = this.loginForm.value;
    this.authService.login(name, password).subscribe({
      next: () => this.router.navigate(['/library']),
      error: () => this.errorMsg.set('Invalid username or password')
    });
  }

  onSignup(): void {
    if (this.signupForm.invalid) {
      return;
    }
    const { name, email, password } = this.signupForm.value;
    this.authService.signup(name, email, password).subscribe({
      next: () => {
        this.signupForm.reset();
        this.isLoginMode.set(true);
        this.successMsg.set('Account created! Please sign in.');
      },
      error: () => this.errorMsg.set('Username is already registered')
    });
  }
}
