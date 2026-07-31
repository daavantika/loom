import { join } from 'path';

// Its own file, imported independently by both uploads.module.ts and
// uploads.controller.ts — those two otherwise import each other (module
// imports the controller to register it; controller needs this constant for
// its FileInterceptor decorator config), and a circular import meant this
// constant was still undefined when the controller's decorator evaluated
// (multer silently fell back to the OS tmpdir instead of erroring).
export const UPLOADS_DIR = join(process.cwd(), 'uploads');
