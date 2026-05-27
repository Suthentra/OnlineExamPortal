import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../shared/services/auth.service';
import { ApiService } from '../../../shared/services/api.service';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.css'],
  standalone: false
})
export class ResultsComponent implements OnInit {
  user: any;
  results: any[] = [];
  loading = true;

  constructor(private auth: AuthService, private api: ApiService) {}

  ngOnInit() {
    this.user = this.auth.getUser();
    this.loadResults();
  }

  loadResults() {
    this.api.getStudentResults(this.user.userId).subscribe({
      next: (data: any) => {
        this.results = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}