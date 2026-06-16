import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TokenInterceptor } from './shared/interceptors/token.interceptor';

// Auth Components
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';

// Student Components
import { DashboardComponent } from './modules/student/dashboard/dashboard.component';
import { ExamComponent } from './modules/student/exam/exam.component';
import { ResultsComponent } from './modules/student/results/results.component';  // ← Make sure this is imported

// Admin Components
import { AdminDashboardComponent } from './modules/admin/admin-dashboard/admin-dashboard.component';
import { CreateExamComponent } from './modules/admin/create-exam/create-exam.component';
import { AddQuestionsComponent } from './modules/admin/add-questions/add-questions.component';
import { EditExamComponent } from './modules/admin/edit-exam/edit-exam.component';
import { ExamResultsComponent } from './modules/admin/exam-results/exam-results.component';
import { StudentPerformanceComponent } from './modules/admin/student-performance/student-performance.component';
import { StudentResultComponent } from './modules/admin/student-result/student-result.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    DashboardComponent,
    ExamComponent,
    ResultsComponent,  // ← Make sure this is declared
    AdminDashboardComponent,
    CreateExamComponent,
    AddQuestionsComponent,
    EditExamComponent,
    ExamResultsComponent,
    StudentPerformanceComponent,
    StudentResultComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      newestOnTop: true,
      preventDuplicates: true,
    }),
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }