import { Component, OnInit, TemplateRef } from '@angular/core';
import * as XLSX from 'xlsx';
import { MatTableDataSource } from '@angular/material/table';
import { Observable, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { TemplateService } from '../../shared/services/template.service';
import { AuthenticationService } from '../../shared/services/authentication.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { Location } from '@angular/common';
import { TableCellErrorDialogsComponent } from '../../shared/dialogs/table-cell-error-dialogs/table-cell-error-dialogs.component';

@Component({
  selector: 'app-validation-result',
  templateUrl: './validation-result.component.html',
  styleUrls: ['./validation-result.component.scss'],
})
export class ValidationResultComponent implements OnInit {
  highlight: boolean = false;
  data: MatTableDataSource<any> | undefined;
  columnNames: any;
  result: any;
  row: any;
  length: any;
  sheetarr: string[] = [];
  wsname: any;
  wbfile: any;
  advancedErrorList: Array<any> = [];
  basicErrorsList: Array<any> = [];
  rowErrorsList: Array<any> = [];
  fileName: string = 'SheetJS.xlsx';
  errors: any = {};
  selectedSheet: any;
  headers: any;
  isUserLogin: boolean = false;
  columnIdentifier: any;
  validateresult: boolean = false;

  tooltipTemplate!: TemplateRef<any>;
  isCreateSurveyDisabled: boolean = false; // Initialize as false
  totalErrors: number = 0;
  errorsCountPerSheet: { [key: string]: number } = {}; // Object to store error counts per sheet

  constructor(
    private route: ActivatedRoute,
    private toastr: ToastrService,
    public dialog: MatDialog,
    private router: Router,
    private templateService: TemplateService,
    private authService: AuthenticationService,
    private _location: Location,
    private toaster: ToastrService
  ) {}

  ngOnInit(): void {
    // Safely read templateError from service (may be undefined)
    this.errors = this.templateService.templateError ?? {};
    // If templateFile is not set, redirect back to selection page
    if (!this.templateService.templateFile) {
      // no file to show — return to selection
      this.router.navigate(['/template/template-selection']);
      return;
    }

    this.onFileChange(this.templateService.templateFile);
    this.isUserLogin = this.authService.isUserLoggedIn();
  }

  copyToClipBoard(error1: any, error2: any) {
    const textToCopy = (error1 || '') + (error2 || '');
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        this.toastr.success('Error copied successfully.', 'Success');
      },
      () => {
        console.error('Failed to copy');
      }
    );
  }

  capitalize(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  onLogout() {
    this.authService.logoutAccount();
    this.isUserLogin = false;
    this.router.navigate(['/auth/login']);
    window.location.reload();
  }

  getOpenStatus(status?: boolean): boolean {
    return status ? !status : false;
  }

  openDialog(error1: any, error2: any) {
    const dialogRef = this.dialog.open(TableCellErrorDialogsComponent, {
      data: { content: (error1 || '') + (error2 || '') },
    });

    dialogRef.afterClosed().subscribe((result) => {
      // no-op
    });
  }

  /**
   * onFileChange now accepts either:
   * - a File (this.templateService.templateFile), or
   * - a DataTransfer-like event with files (from an <input type="file"> change)
   */
  onFileChange(evtOrFile: any) {
    // Ensure we have errors to show; if not, send user back
    this.errors = this.templateService.templateError ?? {};
    if (!this.errors || (!this.errors.basicErrors && !this.errors.advancedErrors && !this.errors.errFileLink)) {
      // Nothing to show - navigate back
      this.router.navigate(['/template/template-selection']);
      return;
    }

    let fileToRead: File | null = null;

    // If caller passed a File (like templateService.templateFile)
    if (evtOrFile instanceof File) {
      fileToRead = evtOrFile as File;
    } else {
      // Treat as event: try to extract file
      const target: DataTransfer = <DataTransfer>evtOrFile;
      fileToRead = target?.files?.[0] ?? null;
    }

    if (!fileToRead) {
      console.error('No file provided to onFileChange');
      this.router.navigate(['/template/template-selection']);
      return;
    }

    const reader: FileReader = new FileReader();
    this.readFile(reader, fileToRead).subscribe((data) => {
      this.initializeTableData(data);
    });
  }

  getErrorsList(column: any, index: number): any {
    let item;
    const advancedList = this.advancedErrorList ?? [];
    if (advancedList.length) {
      item = advancedList
        .map((element: any): any => {
          if (
            (element.rowNumber === index || (Array.isArray(element.rowNumber) && element.rowNumber.includes(index))) &&
            this.columnIdentifier &&
            this.columnIdentifier[column] === element.columnName
          ) {
            return { error: element.errMessage, suggestion: element.suggestion };
          }
        })
        .filter((element: any) => element);
    }
    return item;
  }

  getBasicErrors(column: any, index: number) {
    let item: any = [];
    const basicList = this.basicErrorsList ?? [];
    if (basicList.length) {
      item = basicList
        .map((element: any): any => {
          if (
            (element.rowNumber === index || (Array.isArray(element.rowNumber) && element.rowNumber.includes(index))) &&
            this.columnIdentifier &&
            this.columnIdentifier[column] === element.columnName
          ) {
            return { error: element.errMessage, suggestion: element.suggestion };
          }
        })
        .filter((element: any) => element);
    }
    if (this.rowErrorsList && this.rowErrorsList.length > 0) {
      this.rowErrorsList.forEach((element: any) => {
        if ((element.rowNumber === index || (Array.isArray(element.rowNumber) && element.rowNumber.includes(index)))) {
          item.push({ error: element.errMessage, suggestion: element.suggestion });
        }
      });
    }
    return item;
  }

  isContainsError(column: any, ele: any, row: any, index: number) {
    if (this.rowErrorsList && this.rowErrorsList.length > 0) {
      const item = this.rowErrorsList.find((element: any) => {
        return (Array.isArray(element.rowNumber) && element.rowNumber.includes(index)) || element.rowNumber === index;
      });
      if (item) {
        return true;
      }
    }
    const advList = this.advancedErrorList ?? [];
    const basicList = this.basicErrorsList ?? [];

    if (advList.length || basicList.length) {
      const advancedErrors: any = advList.find(
        (element: any) =>
          (Array.isArray(element.rowNumber) ? element.rowNumber.includes(index) : element.rowNumber === index) &&
          this.columnIdentifier &&
          this.columnIdentifier[column] === element.columnName
      );
      const basicErrors: any = basicList.find(
        (element: any) =>
          (Array.isArray(element.rowNumber) ? element.rowNumber.includes(index) : element.rowNumber === index) &&
          this.columnIdentifier &&
          this.columnIdentifier[column] === element.columnName
      );
      return advancedErrors || basicErrors ? true : false;
    }
    return false;
  }

  /**
   * readFile: reads the provided File and emits the JSON for the FIRST sheet as an array of rows.
   * Uses a Subject to return an Observable for compatibility with your existing code.
   */
  readFile(reader: FileReader, file: File): Observable<any> {
    const sub = new Subject<any>();
    reader.onload = (e: any) => {
      try {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
        this.wbfile = wb;
        this.sheetarr = Array.isArray(wb.SheetNames) ? wb.SheetNames : [];
        // Choose first valid sheet
        const firstSheetName = this.sheetarr.length ? this.sheetarr[0] : undefined;
        if (!firstSheetName) {
          sub.error(new Error('No sheets found in workbook'));
          return;
        }
        const ws: XLSX.WorkSheet = wb.Sheets[firstSheetName];
        const data: any = XLSX.utils.sheet_to_json(ws);
        sub.next(data);
        sub.complete();

        // Initialize selected sheet safely (call onClickSheetName with first or second if exists)
        const sheetToOpen = this.sheetarr.length > 1 ? this.sheetarr[1] : this.sheetarr[0];
        if (sheetToOpen) {
          this.onClickSheetName(sheetToOpen);
        }
      } catch (err) {
        console.error('Error reading file:', err);
        sub.error(err);
      }
    };

    reader.readAsBinaryString(file);

    return sub.asObservable();
  }

  isSlectedSheet(s: any): boolean {
    return s === this.selectedSheet;
  }

  onClickSheetName(s: any) {
    if (!this.wbfile || !Array.isArray(this.wbfile.SheetNames) || !s) {
      return;
    }

    const wsname: string = s;
    const ws: XLSX.WorkSheet = this.wbfile.Sheets[wsname];
    const data: any[] = Array.isArray(XLSX.utils.sheet_to_json(ws)) ? XLSX.utils.sheet_to_json(ws) : [];
    if (data.length === 0) {
      // No rows in sheet
      this.data = new MatTableDataSource<any>(data);
      this.headers = {};
      this.columnIdentifier = {};
      this.columnNames = [];
      this.selectedSheet = s;
      // clear lists
      this.advancedErrorList = [];
      this.basicErrorsList = [];
      this.rowErrorsList = [];
      this.errorsCountPerSheet[this.selectedSheet] = 0;
      this.calculateTotalErrors();
      return;
    }

    this.headers = data[0];
    this.columnIdentifier = data[0];
    this.columnNames = Object.keys(data[0]);
    this.data = new MatTableDataSource<any>(data);
    this.selectedSheet = s;

    // Use safe navigation for errors shape
    const advData = this.errors?.advancedErrors?.data ?? [];
    const basicData = this.errors?.basicErrors?.data ?? [];

    this.advancedErrorList = advData.filter((item: any) => item.sheetName === this.selectedSheet);
    this.basicErrorsList = basicData.filter((item: any) => item.sheetName === this.selectedSheet);
    this.rowErrorsList = [
      ...(this.basicErrorsList.filter((element: any) => !element.columnName || element.columnName.length === 0)),
      ...(this.advancedErrorList.filter((element: any) => !element.columnName || element.columnName.length === 0)),
    ];

    // Update the error count for the current sheet
    this.errorsCountPerSheet[this.selectedSheet] = this.getTotalErrorsForSheet();

    // Recalculate total errors across all sheets
    this.calculateTotalErrors();
  }

  firstRow(index: any): boolean {
    return index === 0;
  }

  export(): void {
    if (this.wbfile) {
      XLSX.writeFile(this.wbfile, `${this.fileName}`);
      this.toaster.success('Downloaded successfully');
    } else {
      this.toaster.error('No workbook available to download');
    }
  }

  errorExcelDownload(): void {
    const link = this.errors?.errFileLink;
    if (link) {
      window.open(link, '_blank');
      this.toaster.success('Downloaded successfully');
    } else {
      this.toaster.error('No error file link available');
    }
  }

  getTotalErrors(): number {
    if (!Array.isArray(this.sheetarr) || this.sheetarr.length === 0) return 0;
    return this.sheetarr.reduce((total: number, sheetName: string) => total + (this.errorsCountPerSheet[sheetName] ?? 0), 0);
  }

  getTotalErrorsForSheet(): number {
    const adv = this.advancedErrorList ? this.advancedErrorList.length : 0;
    const basic = this.basicErrorsList ? this.basicErrorsList.length : 0;
    const row = this.rowErrorsList ? this.rowErrorsList.length : 0;
    return adv + basic + row;
  }

  calculateTotalErrors(): void {
    this.totalErrors = 0;
    if (!Array.isArray(this.sheetarr)) {
      this.totalErrors = 0;
      return;
    }
    for (const sheetName of this.sheetarr) {
      this.totalErrors += this.errorsCountPerSheet[sheetName] ?? 0;
    }
  }

  hasErrors(): boolean {
    return this.getTotalErrors() > 0;
  }

  /**
   * Returns true if ALL sheets have zero errors AND validation result flag is true.
   * Safe against undefined arrays/objects.
   */
  noErrorsInAllSheets(): boolean {
    if (!Array.isArray(this.sheetarr) || this.sheetarr.length === 0) return false;

    // If validateresult flag is false, validation did not pass
    if (!this.validateresult) return false;

    // consider sheet with no entry in errorsCountPerSheet as 0
    return this.sheetarr.every((sheetName: string) => (this.errorsCountPerSheet[sheetName] ?? 0) === 0);
  }

  goBack(): void {
    this._location.back();
  }

  initializeTableData(data: any) {
    // Ensure workbook and sheet list exist
    const wsname: string = this.wbfile?.SheetNames?.[0];
    if (!wsname) {
      this.toaster.error('No sheet found in uploaded file');
      return;
    }
    const ws: XLSX.WorkSheet = this.wbfile.Sheets[wsname];
    const tableData: any[] = Array.isArray(XLSX.utils.sheet_to_json(ws)) ? XLSX.utils.sheet_to_json(ws) : [];
    this.headers = tableData[0] ?? {};
    this.columnIdentifier = tableData[0] ?? {};
    this.columnNames = this.headers ? Object.keys(this.headers) : [];
    this.data = new MatTableDataSource<any>(tableData);
    this.selectedSheet = this.wbfile.SheetNames[0];
    // Determine validate result flag safely
    const advData = this.errors?.advancedErrors?.data ?? [];
    const basicData = this.errors?.basicErrors?.data ?? [];

    // CORRECT LOGIC: validation passes ONLY when BOTH arrays are empty
    this.validateresult = (advData.length === 0 && basicData.length === 0);

    // Update the error lists based on the selected sheet
    this.advancedErrorList = advData.filter((item: any) => item.sheetName === this.selectedSheet);
    this.basicErrorsList = basicData.filter((item: any) => item.sheetName === this.selectedSheet);
    this.rowErrorsList = [
      ...(this.basicErrorsList.filter((element: any) => !element.columnName || element.columnName.length === 0)),
      ...(this.advancedErrorList.filter((element: any) => !element.columnName || element.columnName.length === 0)),
    ];

    // Initialize the errors count for each sheet (use safe getTotalErrorsForSheet for current sheet)
    this.sheetarr.forEach((sheetName: string) => {
      // if the sheet is the currently selected sheet, compute using current lists, otherwise 0 (will be computed when user opens that sheet)
      if (sheetName === this.selectedSheet) {
        this.errorsCountPerSheet[sheetName] = this.getTotalErrorsForSheet();
      } else {
        // default to 0 until the sheet is clicked and lists are built
        this.errorsCountPerSheet[sheetName] = this.errorsCountPerSheet[sheetName] ?? 0;
      }
    });

    // Calculate total errors across all sheets
    this.calculateTotalErrors();
  }
}
