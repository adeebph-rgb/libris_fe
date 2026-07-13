import { Injectable, signal } from '@angular/core';

export interface User {
  name: string;
  email: string;
  yearlyGoal?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(JSON.parse(localStorage.getItem('currentUser') || 'null'));

  signup(name: string, email: string, password: string): boolean {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    if (users.find((u: any) => u.name === name)) {
      return false;
    }
    const newUser = { name, email, password};
    users.push(newUser);
    localStorage.setItem('registeredUsers', JSON.stringify(users));
    this.setCurrentUser({ name, email});
    return true;
  }

  login(name: string, password: string): boolean {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
    const user = users.find((u: any) => u.name === name && u.password === password);
    if (!user) {
      return false;
    }
    this.setCurrentUser({
      name: user.name,
      email: user.email,
    });
    return true;
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUser.set(null);
  }

  updateProfile(changes: Partial<User>): void {
    const user = this.currentUser();
    if (user) {
      const updated = { ...user, ...changes };
      this.setCurrentUser(updated);

      const users = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
      const index = users.findIndex((u: any) => u.name === user.name);
      if (index !== -1) {
        users[index] = { ...users[index], ...changes };
        localStorage.setItem('registeredUsers', JSON.stringify(users));
      }
    }
  }

  private setCurrentUser(user: User): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUser.set(user);
  }
}
