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
  isUserLogin: boolean = false;
  wbfile: XLSX.WorkBook | null = null;
  solutionDict: any = {}; // Holds the solution dictionary
  programName: string = ''; // Holds the program name
  solutionKeyValuePairs: { key: string, value: string }[] = []; // For displaying key-value pairs
  customAuth: any = environment.customAuth;
  isCopied: boolean = false;

  constructor(
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService
  ) {}

  ngOnInit(): void {
    // Subscribe to query parameters
    this.route.queryParams.subscribe(params => {
      // console.log(params, "Query Params 29");

      const solutionParam = params['solution'];
      this.solutionDict = solutionParam ? JSON.parse(solutionParam) : {}; // Parse solutionDict from queryParams

      // Check if solutionDict is empty
      if (Object.keys(this.solutionDict).length === 0) {
        console.error('No solutionDict provided in route');
        return;
      }

      // Extract programName from queryParams
      this.programName = params['program'] || 'Default Program Name'; // Use default if not provided

      // Store key-value pairs from solutionDict for display
      this.solutionKeyValuePairs = Object.entries(this.solutionDict).map(([key, value]) => {
        return { key, value: String(value) }; // Ensure values are string
      });

      // Check if the user is logged in
      this.isUserLogin = this.authService.isUserLoggedIn();
      if (!this.isUserLogin) {
        console.error('User is not logged in');
        this.router.navigate(['/auth/login']);
        return;
      }

      // Check if a template file is present in the service
      if (!this.templateService.templateFile) {
        console.warn('No template file set, redirecting to template selection');
        this.router.navigate(['/template/template-selection']);
        return;
      }

      // Load the file if it exists
      this.onFileChange(this.templateService.templateFile);
    });
  }

  // Handle logout
  onLogout(): void {
    this.authService.logoutAccount();
    this.isUserLogin = false;
    this.router.navigate(['/auth/login']);
  }

  // Handle file change
  onFileChange(fileInput: HTMLInputElement): void {
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      this.readFile(file, reader).subscribe({
        next: (data) => {
          console.log('File processed successfully', data);
        },
        error: (err) => {
          console.error('Error processing file', err);
        }
      });
    } else {
      console.error('No file selected');
    }
  }

  // Read the Excel file
  readFile(file: File, reader: FileReader): Observable<string> {
    const sub = new Subject<string>();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const bstr = e.target?.result as string;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      this.wbfile = wb;
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      const data: any = XLSX.utils.sheet_to_json(ws);
      sub.next(data);
      sub.complete();
    };

    reader.onerror = (error) => {
      sub.error('Error reading file: ' + error);
    };

    reader.readAsBinaryString(file);
    return sub.asObservable();
  }

  // Export the workbook file
  export(): void {
    if (this.wbfile) {
      const fileName = `exported_file_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(this.wbfile, fileName);
    } else {
      console.error('No workbook file available for export');
    }
  }
}
