import { ArgumentsHost, BadRequestException, Catch, ExceptionFilter } from '@nestjs/common';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const error = new BadRequestException({
      message: 'Kiritilgan ma’lumotlarda xato bor',
      issues: exception.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    response.status(error.getStatus()).json(error.getResponse());
  }
}
