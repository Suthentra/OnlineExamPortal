import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';
import { AuthService } from '../../../shared/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnDestroy {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  loginError: string = '';
  
  // Email check states
  emailExists: boolean = false;
  emailChecked: boolean = false;
  checkingEmail: boolean = false;
  
  // Password check states
  passwordVerified: boolean = false;
  checkingPassword: boolean = false;
  passwordTouched: boolean = false;

  private destroy$ = new Subject<void>();

  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private toast: ToastService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(this.emailRegex)
      ]],
      password: ['', [
        Validators.required
      ]]
    });

    // Real-time email validation with debounce
    this.loginForm.get('email')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((email) => {
        if (email && this.loginForm.get('email')?.valid) {
          this.checkEmailExists();
        } else {
          this.emailExists = false;
          this.emailChecked = false;
        }
        // Clear login error when user types
        this.loginError = '';
        this.passwordVerified = false;
      });

    // Real-time password validation with debounce
    this.loginForm.get('password')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((password) => {
        this.passwordTouched = true;
        this.loginError = '';
        this.passwordVerified = false;
        
        // Only check password if email exists and password has value
        if (this.emailExists && password && password.length >= 3) {
          this.checkPasswordInRealTime();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.loginForm.controls; }

  // ===== CHECK IF EMAIL EXISTS IN DATABASE =====
  checkEmailExists() {
    const emailControl = this.loginForm.get('email');
    
    if (!emailControl?.value || emailControl.invalid) {
      this.emailExists = false;
      this.emailChecked = false;
      return;
    }

    this.checkingEmail = true;
    this.emailChecked = false;
    const email = emailControl.value.toLowerCase().trim();

    this.api.checkEmailAvailability(email).subscribe({
      next: (response: any) => {
        this.checkingEmail = false;
        this.emailChecked = true;
        this.emailExists = !response.available;
        
        if (!this.emailExists) {
          this.loginForm.get('password')?.setValue('');
          this.passwordVerified = false;
        }
      },
      error: () => {
        this.checkingEmail = false;
        this.emailChecked = true;
        this.emailExists = false;
      }
    });
  }

  // ===== REAL-TIME PASSWORD VERIFICATION =====
  checkPasswordInRealTime() {
    const email = this.loginForm.get('email')?.value?.toLowerCase().trim();
    const password = this.loginForm.get('password')?.value;

    if (!email || !password || !this.emailExists) {
      return;
    }

    this.checkingPassword = true;
    this.passwordVerified = false;

    const loginData = {
      email: email,
      password: password
    };

    // Use a separate API call to verify password without logging in
    this.api.login(loginData).subscribe({
      next: (response: any) => {
        this.checkingPassword = false;
        this.passwordVerified = true;
        this.loginError = '';
        // Store the token temporarily but don't redirect
        // The actual login will happen on submit
      },
      error: (err) => {
        this.checkingPassword = false;
        this.passwordVerified = false;
        if (err.status === 401) {
          this.loginError = 'Incorrect password. Please try again.';
        } else {
          this.loginError = 'Unable to verify password. Please try again.';
        }
      }
    });
  }

  // ===== ON PASSWORD INPUT =====
  onPasswordInput() {
    this.passwordTouched = true;
    this.loginError = '';
    this.passwordVerified = false;
  }

  // ===== ON SUBMIT =====
  onSubmit() {
    this.submitted = true;
    this.loginError = '';

    if (!this.emailExists) {
      this.toast.warning('Email not found. Please check your email or create an account.');
      return;
    }

    if (this.loginForm.invalid) {
      this.toast.warning('Please enter valid credentials');
      return;
    }

    // If password is already verified, submit directly
    if (this.passwordVerified) {
      this.performLogin();
      return;
    }

    // Otherwise, verify first then login
    this.checkPasswordInRealTime();
    
    // Wait a moment for verification, then submit
    setTimeout(() => {
      if (this.passwordVerified) {
        this.performLogin();
      } else {
        this.toast.warning('Please enter the correct password');
      }
    }, 800);
  }

  private performLogin() {
    this.loading = true;

    const loginData = {
      email: this.loginForm.value.email.toLowerCase().trim(),
      password: this.loginForm.value.password
    };

    this.api.login(loginData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.auth.saveTokenAndUser(response);
        this.toast.success('Login successful! Welcome back.');
        
        if (response.userRole === 'Admin') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.passwordVerified = false;
        this.loginError = 'Incorrect password. Please try again.';
        this.toast.error(this.loginError);
      }
    });
  }
}