import { Component } from '@angular/core';
import { ReportComponent } from './report/report.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReportComponent],
  template: `<app-report />`,
})
export class AppComponent { }