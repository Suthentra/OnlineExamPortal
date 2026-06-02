import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5163/api';

  constructor(private http: HttpClient, private router: Router) {}

  register(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/register`, data);
  }

  login(data: any) {
    return this.http.post(`${this.apiUrl}/Auth/login`, data);
  }

  logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';  // ← Use href instead of navigate
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): any {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user && user.userRole === 'Admin';
  }

  saveTokenAndUser(data: any) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({
      userId: data.userId,
      fullName: data.fullName,
      email: data.email,
      userRole: data.userRole
    }));
  }
}