import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    if (!this.email || !this.password) {
      this.error = 'Please enter email and password';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        console.log('Login response:', res); // Debug
        this.auth.saveTokenAndUser(res);
        
        // Verify token was saved
        const token = this.auth.getToken();
        console.log('Saved token:', token); // Debug
        
        const user = this.auth.getUser();
        if (user?.userRole === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.error = 'Invalid email or password';
        this.loading = false;
      }
    });
  }
}