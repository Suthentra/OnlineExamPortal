import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../shared/services/api.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: false
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  checkingEmail = false;
  emailCheckTimeout: any;

  emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private toast: ToastService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]],
      email: ['', [
        Validators.required,
        Validators.pattern(this.emailRegex)
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(this.passwordRegex)
      ]],
      confirmPassword: ['', [
        Validators.required
      ]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get f() { return this.registerForm.controls; }

  isEmailTaken(): boolean {
    const emailControl = this.registerForm.get('email');
    return emailControl?.hasError('alreadyTaken') || false;
  }

  // ===== REAL-TIME EMAIL INPUT VALIDATION =====
  onEmailInput() {
    const emailControl = this.registerForm.get('email');
    
    if (this.emailCheckTimeout) {
      clearTimeout(this.emailCheckTimeout);
    }

    if (emailControl?.valid && emailControl.value) {
      if (emailControl.hasError('alreadyTaken')) {
        const errors = { ...emailControl.errors };
        delete errors['alreadyTaken'];
        emailControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      
      this.emailCheckTimeout = setTimeout(() => {
        this.checkEmailAvailability();
      }, 500);
    }
  }

  // ===== CHECK EMAIL AVAILABILITY (FRONTEND VALIDATION) =====
  checkEmailAvailability() {
    const emailControl = this.registerForm.get('email');
    
    if (!emailControl?.value || emailControl.invalid) {
      return;
    }

    this.checkingEmail = true;
    const email = emailControl.value.toLowerCase().trim();

    this.api.checkEmailAvailability(email).subscribe({
      next: (response: any) => {
        this.checkingEmail = false;
        if (!response.available) {
          emailControl.setErrors({ ...emailControl.errors, alreadyTaken: true });
          // This shows "Email already registered" below the field
        } else {
          if (emailControl.hasError('alreadyTaken')) {
            const errors = { ...emailControl.errors };
            delete errors['alreadyTaken'];
            emailControl.setErrors(Object.keys(errors).length ? errors : null);
          }
        }
      },
      error: () => {
        this.checkingEmail = false;
      }
    });
  }

  // ===== ON SUBMIT - BACKEND WILL VALIDATE AGAIN =====
  onSubmit() {
    this.submitted = true;
    
    if (this.registerForm.invalid) {
      this.toast.warning('Please fix all validation errors');
      return;
    }
    
    // ✅ Even if frontend validation passes, backend will check again
    // If email was taken but somehow frontend missed it, backend will throw exception
    this.loading = true;
    
    const registerData = {
      fullName: this.registerForm.value.fullName.trim(),
      email: this.registerForm.value.email.toLowerCase().trim(),
      password: this.registerForm.value.password
    };
    
    this.api.register(registerData).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Registration successful! Please login.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        
        // ✅ Backend exception response will be shown here
        // If backend throws ConflictException, it will show as toast
        const errorMessage = err.error?.error || err.error?.message || 'Registration failed';
        this.toast.error(errorMessage);
        
        // ✅ Also mark email field as invalid if it's an email error
        if (err.error?.error?.includes('Email already registered')) {
          this.registerForm.get('email')?.setErrors({ alreadyTaken: true });
        }
        
        console.error('Registration error:', err);
      }
    });
  }

  hasUpperCase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  hasLowerCase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  hasNumber(password: string): boolean {
    return /\d/.test(password);
  }

  hasMinLength(password: string): boolean {
    return password?.length >= 8;
  }
}