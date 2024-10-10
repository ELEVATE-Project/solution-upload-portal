import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './modules/shared/guard/auth.guard';
import { environment } from '../environments/environment'; // Import environment

let routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./modules/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'template',
    canActivate: [AuthGuard],
    loadChildren: () => import('./modules/template/template.module').then(m => m.TemplateModule)
  },
  {
    path: '',
    redirectTo: environment.customAuth ? 'template' : 'auth', // Use environment.customAuth
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: environment.customAuth ? 'template' : 'auth', // Use environment.customAuth
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }