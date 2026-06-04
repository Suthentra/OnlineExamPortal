import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink]
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  message = '';
  isError = false;
  loading = false;

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router
  ) {}

  onSubmit() {
    // Validate current password
    if (!this.currentPassword) {
      this.message = 'Please enter current password';
      this.isError = true;
      return;
    }

    // Validate new password
    if (!this.newPassword) {
      this.message = 'Please enter new password';
      this.isError = true;
      return;
    }

    // Check password length
    if (this.newPassword.length < 6) {
      this.message = 'Password must be at least 6 characters';
      this.isError = true;
      return;
    }

    // Check if passwords match
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'New passwords do not match';
      this.isError = true;
      return;
    }

    this.loading = true;
    this.message = '';

    // Call API to change password
    this.api.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (response) => {
        this.message = 'Password changed successfully! Please login again.';
        this.isError = false;
        this.loading = false;
        
        // Logout after 2 seconds
        setTimeout(() => {
          this.auth.logout();
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to change password. Please check your current password.';
        this.isError = true;
        this.loading = false;
      }
    });
  }
}