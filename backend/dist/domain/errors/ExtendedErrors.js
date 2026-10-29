"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalError = exports.UncAccessError = exports.CsvParseError = exports.JsonParseError = exports.FileIOError = exports.DbError = exports.AppError = void 0;
const DomainError_1 = require("./DomainError");
class AppError extends DomainError_1.DomainError {
    constructor(message, statusCode = 500, code = 'APP_ERROR') {
        super(message, statusCode, code);
    }
}
exports.AppError = AppError;
class DbError extends DomainError_1.DomainError {
    constructor(message = 'Lỗi truy vấn cơ sở dữ liệu') {
        super(message, 500, 'DB_ERROR');
    }
}
exports.DbError = DbError;
class FileIOError extends DomainError_1.DomainError {
    constructor(message = 'Lỗi đọc/ghi tệp tin') {
        super(message, 500, 'FILE_IO_ERROR');
    }
}
exports.FileIOError = FileIOError;
class JsonParseError extends DomainError_1.DomainError {
    constructor(message = 'Lỗi định dạng JSON không hợp lệ') {
        super(message, 400, 'JSON_PARSE_ERROR');
    }
}
exports.JsonParseError = JsonParseError;
class CsvParseError extends DomainError_1.DomainError {
    constructor(message = 'Lỗi định dạng CSV không hợp lệ') {
        super(message, 400, 'CSV_PARSE_ERROR');
    }
}
exports.CsvParseError = CsvParseError;
class UncAccessError extends DomainError_1.DomainError {
    constructor(message = 'Không thể truy cập thư mục UNC hoặc mất kết nối mạng') {
        super(message, 503, 'UNC_ACCESS_ERROR');
    }
}
exports.UncAccessError = UncAccessError;
class ExternalError extends DomainError_1.DomainError {
    constructor(message = 'Lỗi hệ thống bên ngoài') {
        super(message, 502, 'EXTERNAL_ERROR');
    }
}
exports.ExternalError = ExternalError;
