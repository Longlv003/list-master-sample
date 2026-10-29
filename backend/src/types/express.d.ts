import { UserResponseDto } from '../dtos/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: UserResponseDto;
      deviceInfo?: {
        ip: string;
        name: string;
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}
