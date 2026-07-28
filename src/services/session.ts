import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { BACKEND_URL } from './auth.interceptor';

export interface ReadingSessionPayload {
    book_id: number;
    date: string;
    duration_seconds: number;
}

@Injectable({
    providedIn: 'root'
})

export class Session {
    private _statsCache = signal<Record<string, number>>({});

    readonly totalSeconds = computed(() =>
        Object.values(this._statsCache()).reduce((acc, v) => acc + (v || 0), 0)
    );

    constructor(private http: HttpClient) {}

    logSession(payload: ReadingSessionPayload): Observable<any> {
        return this.http.post<any>(`${BACKEND_URL}/reading_sessions/`, payload).pipe(
            tap(() => this.refreshStats())
        );
    }

    refreshStats(): void {
        this.http.get<Record<string, number>>(`${BACKEND_URL}/reading_sessions/stats`).subscribe({
            next: (stats) => this._statsCache.set(stats || {}),
            error: (err) => console.error('Failed to refresh stats:', err)
        });
    }

    getStats(): Observable<Record<string, number>> {
        return this.http.get<Record<string, number>>(`${BACKEND_URL}/reading_sessions/stats`);
    }
}
