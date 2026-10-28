export type StoreRole = 'client' | 'admin';
export interface AuthenticatedUser { id: string; email: string; role: StoreRole }
export interface AuthenticatedRequest extends Request { storeUser?: AuthenticatedUser }
