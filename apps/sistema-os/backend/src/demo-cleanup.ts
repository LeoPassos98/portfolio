import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DemoCleanupService } from './demo-cleanup/demo-cleanup.service.js';

async function runDemoCleanup(): Promise<void> {
  let application: INestApplicationContext | undefined;

  try {
    const { DemoCleanupModule } =
      await import('./demo-cleanup/demo-cleanup.module.js');
    // Suppress framework error logging: database errors may contain secrets.
    application = await NestFactory.createApplicationContext(
      DemoCleanupModule,
      {
        logger: false,
        abortOnError: false,
      },
    );
    const result = await application.get(DemoCleanupService).cleanup();
    await application.close();
    application = undefined;
    process.exitCode = 0;
    console.info(
      `DEMO cleanup completed: ${result.environmentsDeleted} environments removed, ` +
        `${result.sessionsDeleted} sessions removed, ` +
        `${result.generationAttemptsDeleted} generation attempts removed.`,
    );
  } catch {
    process.exitCode = 1;
    console.error('DEMO cleanup failed. No sensitive details were logged.');
  } finally {
    try {
      await application?.close();
    } catch {
      process.exitCode = 1;
      console.error('DEMO cleanup connection shutdown failed.');
    }
  }
}

await runDemoCleanup();
