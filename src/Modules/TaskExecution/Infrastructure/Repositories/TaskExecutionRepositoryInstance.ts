import { httpClient } from '@shared/Services/Http/ApiClient';
import type { ITaskExecutionRepository } from '@modules/TaskExecution/Application/Interfaces/ITaskExecutionRepository';
import { TaskExecutionRepository } from '@modules/TaskExecution/Infrastructure/Repositories/TaskExecutionRepository';

export const taskExecutionRepository: ITaskExecutionRepository = new TaskExecutionRepository(
  httpClient,
);
