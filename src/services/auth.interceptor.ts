import { HttpInterceptorFn } from '@angular/common/http';

export const BACKEND_URL = 'http://localhost:8000';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(BACKEND_URL)) {
    return next(req);
  }

  const token = localStorage.getItem('authToken');

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
