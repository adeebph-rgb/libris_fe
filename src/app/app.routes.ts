import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'library',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('../pages/login/login').then(m => m.Login)
    },
    {
        path: 'library',
        loadComponent: () => import('../pages/mylibrary/mylibrary').then(m => m.Mylibrary),
        canActivate: [authGuard]
    },
    {
        path: 'discover',
        loadComponent: () => import('../pages/discover/discover').then(m => m.Discover),
        canActivate: [authGuard]
    },
    {
        path: 'statistics',
        loadComponent: () => import('../pages/statistics/statistics').then(m => m.Statistics),
        canActivate: [authGuard]
    },
    {   
        path: 'settings',
        loadComponent: () => import('../pages/settings/settings').then(m => m.Settings),
        canActivate: [authGuard]
    },
    {
        path: 'addbook',
        loadComponent: () => import('../pages/add-book/add-book').then(m => m.AddBook),
        canActivate: [authGuard]
    },
    {
        path: 'book/:key',
        loadComponent: () => import('../pages/book-detail/book-detail').then(m => m.BookDetail),
        canActivate: [authGuard]
    },
    {
        path: 'book/:key/read',
        loadComponent: () => import('../pages/book-reader/book-reader').then(m => m.BookReader),
        canActivate: [authGuard]
    }
];

