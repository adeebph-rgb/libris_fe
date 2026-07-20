import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, tap, map } from 'rxjs';
import { BACKEND_URL } from './auth.interceptor';

export interface User {
  name: string;
  email: string;
  yearlyGoal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isInitialized = signal(false);

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('authToken');
    if (token) {
      this.http.get<any>(`${BACKEND_URL}/auth/user`).pipe(
        map(res => ({
          name: res.name,
          email: res.email,
          yearlyGoal: res.yearly_goal
        }))
      ).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.isInitialized.set(true);
        },
        error: () => {
          localStorage.removeItem('authToken');
          this.isInitialized.set(true);
        }
      });
    } else {
      this.isInitialized.set(true);
    }
  }

  
  
  signup(name: string, email: string, password: string): Observable<User> {
    return this.http.post<User>(`${BACKEND_URL}/auth/signup`, { name, email, password });
  }

  login(name: string, password: string): Observable<User> {
    return this.http
      .post<{ access_token: string }>(`${BACKEND_URL}/auth/login`, { name, password })
      .pipe(
        tap((res) => localStorage.setItem('authToken', res.access_token)),
        switchMap(() => this.http.get<any>(`${BACKEND_URL}/auth/user`)),
        map(res => ({
          name: res.name,
          email: res.email,
          yearlyGoal: res.yearly_goal
        })),
        tap((user) => this.currentUser.set(user))
      );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    this.currentUser.set(null);
  }

  updateProfile(changes: Partial<User>): Observable<User> {
    const payload: any = {};
    if (changes.name !== undefined) payload.name = changes.name;
    if (changes.email !== undefined) payload.email = changes.email;
    if (changes.yearlyGoal !== undefined) payload.yearly_goal = changes.yearlyGoal;

    return this.http
      .put<any>(`${BACKEND_URL}/auth/user`, payload)
      .pipe(
        map(res => ({
          name: res.name,
          email: res.email,
          yearlyGoal: res.yearly_goal
        })),
        tap((user) => this.currentUser.set(user))
      );
  }
}
