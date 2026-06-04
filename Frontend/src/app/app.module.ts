import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';  // ← ADD THIS
import { StudentPerformanceComponent } from './modules/admin/student-performance/student-performance.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Auth Components
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';

// Student Components
import { DashboardComponent } from './modules/student/dashboard/dashboard.component';
import { ExamComponent } from './modules/student/exam/exam.component';
import { ResultsComponent } from './modules/student/results/results.component';

// Admin Components
import { AdminDashboardComponent } from './modules/admin/admin-dashboard/admin-dashboard.component';
import { CreateExamComponent } from './modules/admin/create-exam/create-exam.component';
import { AddQuestionsComponent } from './modules/admin/add-questions/add-questions.component';
import { EditExamComponent } from './modules/admin/edit-exam/edit-exam.component';
import { ExamResultsComponent } from './modules/admin/exam-results/exam-results.component';

// Services
import { AuthService } from './shared/services/auth.service';
import { ApiService } from './shared/services/api.service';
import { TokenInterceptor } from './shared/interceptors/token.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    ExamComponent,
    ResultsComponent,
    AdminDashboardComponent,
    CreateExamComponent,
    AddQuestionsComponent,
    EditExamComponent,
    ExamResultsComponent,
    StudentPerformanceComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,      // ← MUST BE HERE
    CommonModule      // ← MUST BE HERE
  ],
  providers: [
    AuthService,
    ApiService,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }