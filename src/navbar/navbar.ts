import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  isMenuOpen = signal(false);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  toggleMenu(): void {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

