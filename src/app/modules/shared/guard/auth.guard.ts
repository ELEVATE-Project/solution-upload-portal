import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';
import { environment } from 'src/environments/environment';  // Updated import statement

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    // Check for customAuth directly from environment
    if (environment.customAuth) {
      return true;
    }

    // Proceed with the usual login check
    if (!this.authenticationService.isUserLoggedIn()) {
      this.router.navigate(['/auth/login']);
      return false;
    }
    return true;
  }
}