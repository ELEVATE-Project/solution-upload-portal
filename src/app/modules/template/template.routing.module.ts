import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TemplateReportComponent } from './template-report/template-report.component';
import { TemplateSelectionComponent } from './template-selection/template-selection.component';
import { TemplateSuccessComponent } from './template-success/template-success.component';
import { ValidationResultComponent } from './validation-result/validation-result.component';
import { TemplateSolutionListComponent } from './template-solution-list/template-solution-list.component'; // Updated import

const routes: Routes = [
  {
    path: 'template-selection', component: TemplateSelectionComponent
  },
  {
    path: 'validation-result', component: ValidationResultComponent
  },
  {
    path: 'template-success', component: TemplateSuccessComponent
  },
  {
    path: 'template-solution-list', component: TemplateSolutionListComponent } // Updated route
  ,
  {
    path: 'template-report', component: TemplateReportComponent
  },
  {
    path: '', redirectTo: 'template-selection', pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TemplateRoutingModule { }
