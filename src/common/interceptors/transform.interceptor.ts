import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta?: any;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode || HttpStatus.OK;

        // Extract message if present in the data returned by the service
        const message = data?.message || 'Success';
        
        // Remove message from the final data object if it was extracted
        let finalData = data;
        if (data && typeof data === 'object' && 'message' in data) {
          const { message: _, ...rest } = data;
          finalData = rest;
        }

        // Handle meta pagination if present
        if (finalData && finalData.data && finalData.meta) {
          return {
            statusCode,
            message,
            data: finalData.data,
            meta: finalData.meta,
          };
        }

        return {
          statusCode,
          message,
          data: finalData || null,
        };
      }),
    );
  }
}
