import { Component, OnInit } from '@angular/core';
import * as XLSX from 'xlsx';
import { TemplateService } from '../../shared/services/template.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Location } from '@angular/common';

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
  solutionKeyValuePairs: { key: string, value: string, isInvalid?: boolean }[] = []; // For displaying key-value pairs
  customAuth: any = environment.customAuth;
  isCopied: boolean = false;

  constructor(
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(({ solution, program = 'Default Program Name' }) => {
      this.solutionDict = solution ? JSON.parse(solution) : {};
      this.programName = program;
  
      if (!Object.keys(this.solutionDict).length) {
        console.error('No solution provided in route');
        return;
      }
  
      // Process each solution dictionary entry
      this.solutionKeyValuePairs = Object.entries(this.solutionDict).map(([key, value]) => {
        const stringValue = value ? String(value) : ''; // Ensure value is always a string
        let displayValue = stringValue;
        let isInvalid = false; // Flag for invalid values
  
        // Check if the solution starts with 'https' (for a valid URL)
        if (stringValue.startsWith('https')) {
          // If the link starts with https, keep it as it is
          displayValue = stringValue;
        } 
        // Check if the solution contains 'validation failed'
        else if (stringValue.includes('validation failed')) {
          displayValue = 'Template Validation failed for this solution. Please check the Template.';
          isInvalid = true; // Mark as invalid if validation failed
        } 
        // Handle unexpected errors (non-https and no validation failure)
        else {
          displayValue = 'We’re unable to complete this request right now. Contact your Administrator for further assistance.';
          isInvalid = true; // Mark as invalid
        }
  
        // Return the key, updated value, and invalid flag
        return { key, value: displayValue, isInvalid };
      });
    });
  }    

  goBack() {
    this.location.back();
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