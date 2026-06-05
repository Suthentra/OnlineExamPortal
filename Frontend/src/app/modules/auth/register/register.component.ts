import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: false
})
export class RegisterComponent {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(private auth: AuthService,private api: ApiService, private router: Router) {}

  // Email validation function
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
validateEmail() {
  
}
async validateEmailAvailability() {
  if (!this.isValidEmail(this.email)) return;
  
  this.api.checkEmailAvailability(this.email).subscribe({
    next: (res: any) => {
      if (!res.available) {
        this.errorMessage = 'Email already registered. Please use a different email.';
      }
    }
  });
}
  onSubmit() {
    // Reset messages
    this.errorMessage = '';
    this.successMessage = '';

    // Validation
    if (!this.fullName || !this.email || !this.password) {
      this.errorMessage = 'All fields are required';
      return;
    }

    // Email format validation
    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address (e.g., name@company.com)';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters';
      return;
    }

    this.loading = true;

    this.auth.register({
      fullName: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => {
        this.successMessage = 'Registration successful! Redirecting to login...';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed';
        this.loading = false;
      }
    });
  }
}