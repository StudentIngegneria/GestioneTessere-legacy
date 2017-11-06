import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core'
import { ObservableMedia, MediaChange, MatchMedia } from '@angular/flex-layout'

import { Socio } from '../model'
import { TableChangeData } from '../common'
import { SociService } from './main.service'
import { AggiuntaSocioComponent } from './aggiunta.component'
import { DettagliSocioComponent } from './dettagli.component'

import { MatSort, MatSnackBar, MatDialog, MatDialogRef, Sort, PageEvent, MatAnchor } from '@angular/material'

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { DataSource } from '@angular/cdk/table';

import { Observable } from 'rxjs/Observable';

@Component({
  selector: 'soci',
  templateUrl: './main.component.html',
  styleUrls: ['../common/style.css', '../common/mainroutes.style.css', './main.component.css'],
})
export class SociComponent implements OnInit {

  displayedColumns = [];
  sociSource: SociDataSource;

  @ViewChild('filter') filter: ElementRef;
  @ViewChild(MatSort) sorter: MatSort;

  constructor(public socisrv: SociService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private changeDetector: ChangeDetectorRef,
    private media: ObservableMedia) {
  }

  updateColumns() {
    if (this.media.isActive('lt-sm')) {
      this.displayedColumns = ['tessera', 'nome', 'cognome', 'cellulare', 'azioni'];
    } else if (this.media.isActive('lt-md')) {
      this.displayedColumns = ['tessera', 'nome', 'cognome', 'email', 'cellulare', 'azioni'];
    } else {
      this.displayedColumns = ['tessera', 'nome', 'cognome', 'email', 'carriera', 'cellulare', 'facebook', 'azioni'];
    }
  }

  ngOnInit() {
    this.socisrv.paginate = true;
    this.sociSource = new SociDataSource(this.socisrv);
    this.changeDetector.detectChanges();
    Observable.fromEvent(this.filter.nativeElement, 'keyup')
      .debounceTime(150)
      .distinctUntilChanged()
      .subscribe(() => {
        if (this.sociSource) { this.sociSource.filter = this.filter.nativeElement.value; }
      });
    this.sorter.sortChange.subscribe(
      (next: Sort) => {
        this.socisrv.orderby = (!next.active || !next.direction) ? '' : next.active;
        this.socisrv.orderasc = (next.direction == 'asc');
        this.socisrv.getSoci();
      }
    )
    this.updateColumns();
    this.media.subscribe(() => { this.updateColumns(); });
  }

  addSocio() {
    let diagopened: MatDialogRef<AggiuntaSocioComponent> = this.dialog.open(AggiuntaSocioComponent,{
      width: "80vw"
    });
    diagopened.afterClosed().subscribe(
      newSocio => { if (newSocio) { this.socisrv.addSocio(newSocio); } }
    )
  }

  editSocio(selected: Socio) {
    let diagopened: MatDialogRef<DettagliSocioComponent> = this.dialog.open(DettagliSocioComponent, {
      width: "80vw",
      data: { socio: selected }
    });
  }

  pageChange(event: PageEvent) {
    this.socisrv.index = event.pageIndex;
    this.socisrv.limit = event.pageSize;
    this.socisrv.getSoci();
  }

  togglePagination() {
    this.socisrv.paginate = !this.socisrv.paginate;
    this.socisrv.getSoci();
  }

  filename: string;
  fileurl: string;

  once = false;

  @ViewChild('downloadAnchor') anchor: MatAnchor;

  downloadCsv() {
    if (!this.once) {
      this.socisrv.requestCsv().subscribe(
        (file: File) => {
          this.once = true;
          this.anchor._elementRef.nativeElement.download = file.name;
          this.anchor._elementRef.nativeElement.href = URL.createObjectURL(file);
          this.anchor._elementRef.nativeElement.click();
        }
      );
      return false;
    } else {
      this.once = false;
      return true;
    }
  }
}

class SociDataSource extends DataSource<Socio>{

  _filterChange = new BehaviorSubject<string>('');

  set filter(f: string) {
    this._filterChange.next(f);
  }

  constructor(private socisrv: SociService) {
    super();
  }

  connect(): Observable<Socio[]> {
    const displayDataChanges = [
      this._filterChange,
      this.socisrv.getSoci()
    ];
    return Observable.combineLatest(
      ...displayDataChanges,
      (filter_in: string, input: Socio[]) => {
        return { data: input, filter: filter_in }
      }).map(
      (x: TableChangeData<Socio[]>) => {
        let data = x.data.slice().filter((item: Socio) => {
          return item.contains(x.filter.toLowerCase());
        })
        return data;
      }
      );
  }

  disconnect() { }
}