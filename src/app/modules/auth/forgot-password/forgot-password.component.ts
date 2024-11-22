import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TemplateService } from '../../shared/services/template.service';
import { ToastrService } from 'ngx-toastr';
import { Location } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  email: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  constructor(
    private templateService: TemplateService,
    private router: Router,
    private toastr: ToastrService,
    private location: Location
  ) {}
  goBack() {
    this.location.back();
  }
  onSubmit(): void {
    // Basic validation for empty fields
    if (!this.email.trim() || !this.newPassword.trim() || !this.confirmPassword.trim()) {
      this.toastr.error('All fields are required.', 'Error');
      return;
    }

    // Password mismatch check
    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('Passwords do not match.', 'Error');
      return;
    }

    // Call the forgotPassword method
    this.templateService
      .forgotPassword(this.email, this.newPassword, this.confirmPassword)
      .subscribe({
        next: (response: any) => {
          // Handle success response
          console.log('Success response:', response); // Debug response
          const successMessage = response.response || 'Password reset successful!';
          this.toastr.success(successMessage, 'Success');
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000); // Redirect after 2 seconds for user clarity
        },
        error: (error: any) => {
          if (error.length > 0) {
            const backendError = error;
            this.toastr.error(backendError, 'Error');
          } else {
            // Fallback for unexpected error structures
            this.toastr.error('An unexpected error occurred. Please try again.', 'Error');
          }
        },
      });
  }
}
