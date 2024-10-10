import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { TemplateService } from '../../shared/services/template.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-template-success',
  templateUrl: './template-success.component.html',
  styleUrls: ['./template-success.component.scss']
})
export class TemplateSuccessComponent implements OnInit {
  isUserLogin: any = false;
  wbfile: any;
  solutionId: any = "";
  solutionUrl: any = "";
  // customAuth: any = window["env" as any]["customAuth" as any];
  customAuth: any = environment.customAuth;
  isCopied: boolean = false;

  constructor(
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService
  ) { }

  ngOnInit(): void {
    // Subscribe to route parameters
    this.route.params.subscribe(params => {
      this.solutionId = params['solutionId'];
    });
  
    // Subscribe to query parameters
    this.route.queryParams.subscribe(params => {
      this.solutionUrl = params['downloadbleUrl'];
  
      // Check if the user is logged in
      this.isUserLogin = this.authService.isUserLoggedIn();
  
      // If the template file is not set, navigate to the template selection page
      if (!this.templateService.templateFile) {
        this.router.navigate(['/template/template-selection']);
      } else {
        // If the template file is set, handle the file change
        this.onFileChange(this.templateService.templateFile);
      }
    });
  }  

  copyText() {
    /* Copy text into clipboard */
    navigator.clipboard.writeText(this.solutionUrl).then(() => {
      this.isCopied = true;
      setTimeout(() => {
        this.isCopied = false;
      }, 2000); // Hide the "Copied!" message after 2 seconds
    }).catch(err => {
    });
  }

  onLogout() {
    this.authService.logoutAccount();
    this.isUserLogin = false;
    this.router.navigate(['/auth/login']);
  }

  onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>evt;
    const reader: FileReader = new FileReader();
    this.readFile(target, reader).subscribe((output) => { });
  }

  readFile(target: DataTransfer, reader: FileReader): Observable<string> {
    const sub = new Subject<string>();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      this.wbfile = wb;
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      /* save data */
      const data: any = XLSX.utils.sheet_to_json(ws);
      sub.next(data);
      sub.complete();
    };

    reader.readAsBinaryString(target.files[0]);
    return sub.asObservable();
  }

  export(): void {
    XLSX.writeFile(this.wbfile, `$file.xlsx`);
  }
}
