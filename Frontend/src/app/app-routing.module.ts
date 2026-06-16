import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { DashboardComponent } from './modules/student/dashboard/dashboard.component';
import { ExamComponent } from './modules/student/exam/exam.component';
import { ResultsComponent } from './modules/student/results/results.component';
import { AdminDashboardComponent } from './modules/admin/admin-dashboard/admin-dashboard.component';
import { CreateExamComponent } from './modules/admin/create-exam/create-exam.component';
import { AddQuestionsComponent } from './modules/admin/add-questions/add-questions.component';
import { EditExamComponent } from './modules/admin/edit-exam/edit-exam.component';
import { ExamResultsComponent } from './modules/admin/exam-results/exam-results.component';
import { StudentPerformanceComponent } from './modules/admin/student-performance/student-performance.component';
import { StudentResultComponent } from './modules/admin/student-result/student-result.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'exam/:id', component: ExamComponent },  // ← This must be correct
  { path: 'results', component: ResultsComponent },
  { path: 'result-detail/:id', component: ResultsComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'admin/create-exam', component: CreateExamComponent },
  { path: 'admin/add-questions/:id', component: AddQuestionsComponent },
  { path: 'admin/edit-exam/:id', component: EditExamComponent },
  { path: 'admin/exam-results/:id', component: ExamResultsComponent },
  { path: 'admin/student-performance/:id', component: StudentPerformanceComponent },
  { path: 'admin/student-result/:id', component: StudentResultComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }