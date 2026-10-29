import { DomainError } from './DomainError';

export class AppError extends DomainError {
  constructor(message: string, statusCode = 500, code = 'APP_ERROR') {
    super(message, statusCode, code);
  }
}

export class DbError extends DomainError {
  constructor(message = 'Lỗi truy vấn cơ sở dữ liệu') {
    super(message, 500, 'DB_ERROR');
  }
}

export class FileIOError extends DomainError {
  constructor(message = 'Lỗi đọc/ghi tệp tin') {
    super(message, 500, 'FILE_IO_ERROR');
  }
}

export class JsonParseError extends DomainError {
  constructor(message = 'Lỗi định dạng JSON không hợp lệ') {
    super(message, 400, 'JSON_PARSE_ERROR');
  }
}

export class CsvParseError extends DomainError {
  constructor(message = 'Lỗi định dạng CSV không hợp lệ') {
    super(message, 400, 'CSV_PARSE_ERROR');
  }
}

export class UncAccessError extends DomainError {
  constructor(message = 'Không thể truy cập thư mục UNC hoặc mất kết nối mạng') {
    super(message, 503, 'UNC_ACCESS_ERROR');
  }
}

export class ExternalError extends DomainError {
  constructor(message = 'Lỗi hệ thống bên ngoài') {
    super(message, 502, 'EXTERNAL_ERROR');
  }
}
