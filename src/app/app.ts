import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { GlobalNoticeComponent } from './shared/ui/global-notice.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalNoticeComponent],
  template: '<taji-global-notice /><router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
