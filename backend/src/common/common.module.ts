import { Global, Module } from '@nestjs/common';
import { TimeService } from './time.service';
import { CryptoService } from './crypto.service';

@Global()
@Module({
  providers: [TimeService, CryptoService],
  exports: [TimeService, CryptoService],
})
export class CommonModule {}
