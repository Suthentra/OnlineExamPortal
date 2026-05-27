import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EditExamComponent } from './modules/admin/edit-exam/edit-exam.component';
import { LoginComponent } from './modules/auth/login/login.component';
import { RegisterComponent } from './modules/auth/register/register.component';
import { DashboardComponent } from './modules/student/dashboard/dashboard.component';
import { ExamComponent } from './modules/student/exam/exam.component';
import { ResultsComponent } from './modules/student/results/results.component';
import { AdminDashboardComponent } from './modules/admin/admin-dashboard/admin-dashboard.component';
import { CreateExamComponent } from './modules/admin/create-exam/create-exam.component';
import { AddQuestionsComponent } from './modules/admin/add-questions/add-questions.component';

const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'exam/:id', component: ExamComponent },
  { path: 'results', component: ResultsComponent },
  { path: 'admin', component: AdminDashboardComponent },
  { path: 'admin/create-exam', component: CreateExamComponent },
  { path: 'admin/add-questions/:id', component: AddQuestionsComponent },
  { path: 'admin/edit-exam/:id', component: EditExamComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }