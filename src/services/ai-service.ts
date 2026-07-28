import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BACKEND_URL } from './auth.interceptor';


export interface VocabularyItem{
    word: string;
    definition: string;
    simple_synonym: string;
}

export interface TextSimplificationRequest{
    text:string;
    book_title?: string;
    mode?: string;
}


export interface TextSimplificationResponse{
    original_text: string;
    simplified_text: string;
    summary: string;
    key_vocabulary: VocabularyItem[];
}

@Injectable({
    providedIn: 'root'
})

export class AiService{
    constructor(private http:HttpClient){}

    simplifyText(payload : TextSimplificationRequest):Observable<TextSimplificationResponse>{
        return this.http.post<TextSimplificationResponse>(`${BACKEND_URL}/ai/simplify`,payload);
    }
}