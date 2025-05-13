import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/config/app.config';
import { BootstrapComponent } from './app/bootstrap/bootstrap.component';

bootstrapApplication(BootstrapComponent, appConfig)
  .catch((err) => console.error(err));
